/**
 * Picmotion — Complete AI Pipeline
 *
 * Flow: Photos → Upload to RH → Banana Pro Storyboard → Split 9-grid →
 *       Generate 9 Videos → FFmpeg Composite → Final Vlog
 */

import { exec as execCb } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

import sharp from "sharp";

import { updateJob } from "@/lib/jobs/store";
import { getStorageService } from "@/shared/services/storage";

const execAsync = promisify(execCb);

// ─── Constants ───────────────────────────────────────────────────────

const RH_BASE = "https://www.runninghub.cn";
const BANANA_PRO_WORKFLOW = "1975470159655735297";
const IMG2VIDEO_WORKFLOW = "1981205313925931010";

const PHOTO_NODE_IDS = ["137", "141", "48", "148", "152", "172", "171", "166", "167", "168"];

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 15 * 60_000; // 15 min
const VIDEO_POLL_TIMEOUT_MS = 20 * 60_000; // 20 min per video
const MAX_VIDEO_CONCURRENCY = 3;

function rhApiKey(): string {
  const key = process.env.RUNNINGHUB_API_KEY;
  if (!key) throw new Error("RUNNINGHUB_API_KEY is not set");
  return key;
}

// ─── Style Prompts ───────────────────────────────────────────────────

interface StylePrompts {
  storyboardPrompt: string;
  qualityPrompt: string;
  videoPrompt: string;
}

function getStylePrompts(style: string): StylePrompts {
  const styles: Record<string, StylePrompts> = {
    cinematic: {
      storyboardPrompt:
        "要求：电影感写实风格，多角度，多景别，3*3九宫格，图像必须9:16，保持9个分镜9:16比例不变。不要输出字幕和无关紧要的内容。强调光影对比、大片质感、戏剧性构图，延续图1风格。",
      qualityPrompt:
        "要求镜头要有电影级特效和光影，8K Ultra HD超高清分辨率，Unreal Engine 5渲染结合Ray Tracing光线追踪与Global Illumination全局光照，电影级打光搭配HDR高动态范围与柔光漫射效果，通过微细节纹理、清晰边缘渲染强化电影美学，呈现照片级真实感与超细腻氛围的影视级画质图像。",
      videoPrompt:
        "电影级运镜，镜头缓慢推进，光影流转，景深变化丰富，画面质感细腻，大片氛围感。",
    },
    romantic: {
      storyboardPrompt:
        "要求：浪漫柔光风格，多角度，多景别，3*3九宫格，图像必须9:16，保持9个分镜9:16比例不变。不要输出字幕和无关紧要的内容。强调柔光、暖色调、浪漫氛围，延续图1风格。",
      qualityPrompt:
        "要求柔光暖色调，8K Ultra HD超高清分辨率，柔焦散景效果，暖色调色彩渲染，自然光与人工补光结合，皮肤质感细腻通透，画面整体呈现温暖浪漫的氛围，如同婚纱摄影般的梦幻质感。",
      videoPrompt:
        "浪漫柔光运镜，镜头轻柔滑动，暖色调光晕，慢动作捕捉细腻表情，画面温馨浪漫。",
    },
    travel: {
      storyboardPrompt:
        "要求：旅行纪录片风格，多角度，多景别，3*3九宫格，图像必须9:16，保持9个分镜9:16比例不变。不要输出字幕和无关紧要的内容。强调自然光、真实感、旅行Vlog质感，延续图1风格。",
      qualityPrompt:
        "要求自然光线，8K Ultra HD超高清分辨率，纪录片级别的真实质感，自然色彩还原，环境光与人物的和谐融合，画面清晰锐利，呈现旅行纪录片般的沉浸式视觉体验。",
      videoPrompt:
        "旅行纪录片运镜，镜头自然跟随，手持微晃增加真实感，自然光线变化，环境音氛围。",
    },
  };

  return styles[style] ?? styles.cinematic;
}

// ─── RH API Helpers ──────────────────────────────────────────────────

async function rhPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${RH_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rhApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RH ${path} HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(`RH ${path} code=${json.code}: ${json.msg ?? json.message ?? "unknown"}`);
  }

  return json.data !== undefined ? json.data : json;
}

interface RHTaskResponse {
  taskId: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  results?: Array<{ url: string; outputType: string; text?: string }> | null;
}

async function rhSubmitWorkflow(
  workflowId: string,
  nodeInfoList: Array<Record<string, string>>,
): Promise<RHTaskResponse> {
  const res = await fetch(`${RH_BASE}/openapi/v2/run/ai-app/${workflowId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rhApiKey()}`,
    },
    body: JSON.stringify({
      nodeInfoList,
      instanceType: "default",
      usePersonalQueue: "false",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RH submit workflow HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

async function rhQuery(taskId: string): Promise<RHTaskResponse> {
  const res = await fetch(`${RH_BASE}/openapi/v2/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rhApiKey()}`,
    },
    body: JSON.stringify({ taskId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RH query HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

async function rhPollUntilDone(
  taskId: string,
  timeoutMs = POLL_TIMEOUT_MS,
): Promise<RHTaskResponse> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await rhQuery(taskId);
    console.log(`[pipeline] poll ${taskId}: status=${result.status}`);

    if (result.status === "SUCCESS") return result;
    if (result.status === "FAILED") {
      throw new Error(`RH task ${taskId} failed: ${result.errorMessage ?? "unknown"}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`RH task ${taskId} timed out after ${timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Step 1: Upload Photos to RunningHub ─────────────────────────────

export async function uploadPhotosToRH(photoUrls: string[]): Promise<string[]> {
  console.log(`[pipeline] uploading ${photoUrls.length} photos to RunningHub`);
  const rhNames: string[] = [];

  for (const url of photoUrls) {
    // Download from R2
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download photo: ${url} (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    // Determine filename extension
    const contentType = res.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

    // Upload to RH as multipart form
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.append("file", blob, `photo.${ext}`);

    const uploadRes = await fetch(`${RH_BASE}/openapi/v2/media/upload/binary`, {
      method: "POST",
      headers: { Authorization: `Bearer ${rhApiKey()}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`RH upload failed (${uploadRes.status}): ${text}`);
    }

    const uploadJson = await uploadRes.json();
    if (uploadJson.code !== 0) {
      throw new Error(`RH upload error: ${uploadJson.message ?? "unknown"}`);
    }

    const fileName = uploadJson.data?.fileName ?? uploadJson.data?.download_url;
    if (!fileName) throw new Error("RH upload returned no fileName");

    console.log(`[pipeline] uploaded → ${fileName}`);
    rhNames.push(fileName);
  }

  return rhNames;
}

// ─── Step 2: Generate Storyboard (Banana Pro) ────────────────────────

export async function generateStoryboard(
  rhPhotoNames: string[],
  style: string,
): Promise<string> {
  console.log(`[pipeline] generating storyboard, style=${style}, photos=${rhPhotoNames.length}`);
  const prompts = getStylePrompts(style);

  // Distribute photos across 10 reference node IDs (cycle if fewer)
  const nodeInfoList: Array<Record<string, string>> = [];

  for (let i = 0; i < PHOTO_NODE_IDS.length; i++) {
    const photoName = rhPhotoNames[i % rhPhotoNames.length];
    nodeInfoList.push({
      nodeId: PHOTO_NODE_IDS[i],
      fieldName: "image",
      fieldValue: photoName,
    });
  }

  // Prompt nodes
  nodeInfoList.push({
    nodeId: "161",
    fieldName: "text",
    fieldValue: prompts.storyboardPrompt,
  });
  nodeInfoList.push({
    nodeId: "160",
    fieldName: "text",
    fieldValue: prompts.qualityPrompt,
  });

  // Aspect ratio 9:16
  nodeInfoList.push({
    nodeId: "156",
    fieldName: "aspectRatio",
    fieldValue: "9:16",
  });
  nodeInfoList.push({
    nodeId: "156",
    fieldName: "resolution",
    fieldValue: "4k",
  });
  nodeInfoList.push({
    nodeId: "156",
    fieldName: "channel",
    fieldValue: "Third-party",
  });

  const submitResult = await rhSubmitWorkflow(BANANA_PRO_WORKFLOW, nodeInfoList);
  const taskId = submitResult.taskId;
  if (!taskId) throw new Error("Banana Pro submit returned no taskId");
  console.log(`[pipeline] storyboard taskId=${taskId}`);

  const result = await rhPollUntilDone(taskId);

  const storyboardUrl = result.results?.[0]?.url;
  if (!storyboardUrl) throw new Error("Storyboard task returned no output URL");

  console.log(`[pipeline] storyboard ready: ${storyboardUrl}`);
  return storyboardUrl;
}

// ─── Step 3: Split 9-Grid Storyboard ─────────────────────────────────

export async function splitStoryboard(storyboardUrl: string): Promise<string[]> {
  console.log(`[pipeline] splitting storyboard into 9 frames`);

  // Download the 9-grid image
  const res = await fetch(storyboardUrl);
  if (!res.ok) throw new Error(`Failed to download storyboard: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Get image dimensions
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // 3x3 grid
  const cellW = Math.floor(width / 3);
  const cellH = Math.floor(height / 3);

  const storage = await getStorageService();
  const frameUrls: string[] = [];
  const timestamp = Date.now();

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const frameBuffer = await sharp(buffer)
        .extract({
          left: col * cellW,
          top: row * cellH,
          width: cellW,
          height: cellH,
        })
        .png()
        .toBuffer();

      const key = `vlog/frames/${timestamp}_frame_${idx}.png`;
      const result = await storage.uploadFile({
        body: frameBuffer,
        key,
        contentType: "image/png",
      });

      if (!result.success || !result.url) {
        throw new Error(`Failed to upload frame ${idx}: ${result.error}`);
      }

      console.log(`[pipeline] frame ${idx} → ${result.url}`);
      frameUrls.push(result.url);
    }
  }

  return frameUrls;
}

// ─── Step 4: Generate Videos (img2video) ─────────────────────────────

export async function generateVideos(
  frameUrls: string[],
  style: string,
): Promise<string[]> {
  console.log(`[pipeline] generating ${frameUrls.length} videos, style=${style}`);
  const prompts = getStylePrompts(style);

  // Upload each frame to RH first
  const rhFrameNames = await uploadPhotosToRH(frameUrls);

  // Submit video tasks with concurrency limit
  const taskIds: string[] = [];
  for (let i = 0; i < rhFrameNames.length; i += MAX_VIDEO_CONCURRENCY) {
    const batch = rhFrameNames.slice(i, i + MAX_VIDEO_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((frameName) => submitVideoTask(frameName, prompts.videoPrompt)),
    );
    taskIds.push(...batchResults);
    console.log(`[pipeline] submitted video batch ${Math.floor(i / MAX_VIDEO_CONCURRENCY) + 1}, taskIds: ${batchResults.join(", ")}`);
  }

  // Poll all tasks
  const videoUrls: string[] = [];
  for (const taskId of taskIds) {
    const result = await rhPollUntilDone(taskId, VIDEO_POLL_TIMEOUT_MS);
    const url = result.results?.[0]?.url;
    if (!url) throw new Error(`Video task ${taskId} returned no output URL`);
    videoUrls.push(url);
    console.log(`[pipeline] video ready: ${url}`);
  }

  return videoUrls;
}

async function submitVideoTask(rhFrameName: string, videoPrompt: string): Promise<string> {
  const nodeInfoList = [
    { nodeId: "412", fieldName: "image", fieldValue: rhFrameName },
    { nodeId: "388", fieldName: "value", fieldValue: videoPrompt },
    { nodeId: "422", fieldName: "select", fieldValue: "2" },
    { nodeId: "425", fieldName: "aspect_ratio", fieldValue: "9:16 (Slim Vertical)" },
    { nodeId: "410", fieldName: "value", fieldValue: "1280" },
    { nodeId: "373", fieldName: "value", fieldValue: "6" },
    { nodeId: "409", fieldName: "value", fieldValue: "6" },
  ];

  const result = await rhSubmitWorkflow(IMG2VIDEO_WORKFLOW, nodeInfoList);
  if (!result.taskId) throw new Error("img2video submit returned no taskId");
  return result.taskId;
}

// ─── BGM Helper ──────────────────────────────────────────────────────

const BGM_MAP: Record<string, string> = {
  cinematic: "cinematic.mp3",
  romantic: "romantic.mp3",
  travel: "travel.mp3",
};

async function resolveBgmPath(style: string): Promise<string | null> {
  const filename = BGM_MAP[style];
  if (!filename) return null;

  const bgmPath = join(process.cwd(), "public", "bgm", filename);
  try {
    await fs.access(bgmPath);
    return bgmPath;
  } catch {
    console.log(`[pipeline] BGM file not found: ${bgmPath}, skipping BGM`);
    return null;
  }
}

/**
 * Get the duration of a video file in seconds via ffprobe.
 */
async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
  );
  const dur = parseFloat(stdout.trim());
  return isNaN(dur) ? 0 : dur;
}

// ─── Step 5: Composite Vlog (FFmpeg) ─────────────────────────────────

export async function compositeVlog(videoUrls: string[], style: string = "cinematic"): Promise<string> {
  console.log(`[pipeline] compositing ${videoUrls.length} videos into final vlog, style=${style}`);

  const workDir = join(tmpdir(), `picmotion_${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // Download all video clips
    const clipPaths: string[] = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const clipPath = join(workDir, `clip_${i}.mp4`);
      const res = await fetch(videoUrls[i]);
      if (!res.ok) throw new Error(`Failed to download video ${i}: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(clipPath, buf);
      clipPaths.push(clipPath);
      console.log(`[pipeline] downloaded clip ${i}`);
    }

    const composedPath = join(workDir, "composed.mp4");
    const outputPath = join(workDir, "final.mp4");

    if (clipPaths.length === 1) {
      // Single clip, just copy
      await fs.copyFile(clipPaths[0], composedPath);
    } else {
      // Build ffmpeg crossfade filter chain
      const crossfadeDuration = 1;
      const filterParts: string[] = [];
      const inputs = clipPaths.map((p) => `-i "${p}"`).join(" ");

      // First, set all inputs as labeled streams
      let currentLabel = "[0:v]";
      for (let i = 1; i < clipPaths.length; i++) {
        const nextLabel = `[${i}:v]`;
        const outLabel = i < clipPaths.length - 1 ? `[v${i}]` : "[vout]";
        filterParts.push(
          `${currentLabel}${nextLabel}xfade=transition=fade:duration=${crossfadeDuration}:offset=${i * 6 - crossfadeDuration * i}${outLabel}`,
        );
        currentLabel = outLabel;
      }

      // Audio: concat all audio streams
      const audioInputs = clipPaths.map((_, i) => `[${i}:a]`).join("");
      const audioFilter = `${audioInputs}concat=n=${clipPaths.length}:v=0:a=1[aout]`;

      const filterComplex = [...filterParts, audioFilter].join(";");

      const cmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${composedPath}"`;

      console.log(`[pipeline] ffmpeg compose cmd: ${cmd}`);
      await execAsync(cmd, { timeout: 300_000 }); // 5 min timeout
    }

    // ── BGM Mixing ──────────────────────────────────────────────────
    const bgmPath = await resolveBgmPath(style);

    if (bgmPath) {
      console.log(`[pipeline] mixing BGM: ${bgmPath}`);
      const duration = await getVideoDuration(composedPath);
      const fadeOutStart = Math.max(0, duration - 5);

      // BGM: trim to video length, fade out last 5s, volume 0.25
      // Original audio: keep at volume 0.8
      // amix merges both; duration=first ensures output matches video length
      const bgmFilter = [
        `[1:a]atrim=0:${duration},afade=t=out:st=${fadeOutStart}:d=5,volume=0.25[bgm]`,
        `[0:a]volume=0.8[orig]`,
        `[orig][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      ].join(";");

      const bgmCmd = `ffmpeg -y -i "${composedPath}" -i "${bgmPath}" -filter_complex "${bgmFilter}" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;

      console.log(`[pipeline] ffmpeg bgm cmd: ${bgmCmd}`);
      await execAsync(bgmCmd, { timeout: 120_000 });
    } else {
      // No BGM available, use composed output as-is
      await fs.rename(composedPath, outputPath);
    }

    // Upload to R2
    const finalBuffer = await fs.readFile(outputPath);
    const storage = await getStorageService();
    const key = `vlog/output/${Date.now()}_final.mp4`;
    const result = await storage.uploadFile({
      body: finalBuffer,
      key,
      contentType: "video/mp4",
    });

    if (!result.success || !result.url) {
      throw new Error(`Failed to upload final video: ${result.error}`);
    }

    console.log(`[pipeline] final vlog uploaded: ${result.url}`);
    return result.url;
  } finally {
    // Cleanup temp dir
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Orchestrate: Full Pipeline ──────────────────────────────────────

export interface OrchestrateOptions {
  jobId: string;
  photoUrls: string[];
  style: string;
}

export async function orchestrate({ jobId, photoUrls, style }: OrchestrateOptions): Promise<string> {
  console.log(`[pipeline] orchestrate start jobId=${jobId}, style=${style}, photos=${photoUrls.length}`);

  try {
    await updateJob(jobId, { status: "processing" });

    // Step 1: Upload photos to RunningHub
    const rhPhotoNames = await uploadPhotosToRH(photoUrls);

    // Step 2: Generate storyboard
    const storyboardUrl = await generateStoryboard(rhPhotoNames, style);

    // Step 3: Split storyboard into 9 frames
    const frameUrls = await splitStoryboard(storyboardUrl);

    // Step 4: Generate videos from frames
    const videoUrls = await generateVideos(frameUrls, style);

    // Step 5: Composite final vlog with BGM
    const finalUrl = await compositeVlog(videoUrls, style);

    await updateJob(jobId, { status: "completed", videoUrl: finalUrl, completedAt: new Date() });
    console.log(`[pipeline] orchestrate done jobId=${jobId}, url=${finalUrl}`);
    return finalUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] orchestrate failed jobId=${jobId}:`, msg);
    await updateJob(jobId, { status: "failed", errorMessage: msg }).catch(() => {});
    throw err;
  }
}
