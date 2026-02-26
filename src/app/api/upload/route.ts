import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const PRESIGN_EXPIRES = 15 * 60; // 15 minutes

interface UploadRequest {
  /** Number of photos to upload (1-20) */
  count: number;
  /** Optional session/batch uuid — auto-generated if omitted */
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UploadRequest;

    const count = body.count;
    if (!count || typeof count !== "number" || count < 1 || count > 20) {
      return NextResponse.json(
        { error: "count must be between 1 and 20" },
        { status: 400 },
      );
    }

    const sessionId = body.sessionId || uuidv4();

    const urls = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const key = `uploads/${sessionId}/photo-${i}.jpg`;

        const command = new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: "image/jpeg",
        });

        const presignedUrl = await getSignedUrl(s3, command, {
          expiresIn: PRESIGN_EXPIRES,
        });

        return {
          index: i,
          key,
          uploadUrl: presignedUrl,
          publicUrl: `${PUBLIC_URL}/${key}`,
        };
      }),
    );

    return NextResponse.json({
      sessionId,
      urls,
    });
  } catch (err) {
    console.error("[upload] Failed to generate presigned URLs:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URLs" },
      { status: 500 },
    );
  }
}
