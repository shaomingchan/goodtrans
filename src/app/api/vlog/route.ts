import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createJob } from "@/lib/jobs/store";

const VALID_STYLES = [
  "cinematic",
  "romantic",
  "travel",
  "vlog",
  "vintage",
  "anime",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrls, style } = body;

    // Validate photoUrls
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: "photoUrls must be a non-empty array" },
        { status: 400 },
      );
    }

    if (photoUrls.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 photos allowed" },
        { status: 400 },
      );
    }

    if (!photoUrls.every((u: unknown) => typeof u === "string" && u.startsWith("http"))) {
      return NextResponse.json(
        { error: "Each photoUrl must be a valid HTTP URL" },
        { status: 400 },
      );
    }

    // Validate style
    if (!style || !VALID_STYLES.includes(style)) {
      return NextResponse.json(
        { error: `style must be one of: ${VALID_STYLES.join(", ")}` },
        { status: 400 },
      );
    }

    // Create job
    const jobId = uuidv4();
    await createJob(jobId, photoUrls, style);

    // TODO Phase 2: kick off the actual pipeline
    // runPipeline({ userId: "...", photoUrls, style })

    return NextResponse.json({ jobId, status: "pending" });
  } catch (err) {
    console.error("[vlog] Failed to create job:", err);
    return NextResponse.json(
      { error: "Failed to create vlog job" },
      { status: 500 },
    );
  }
}
