import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Invalid jobId" },
        { status: 400 },
      );
    }

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      style: job.style,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      ...(job.videoUrl && { videoUrl: job.videoUrl }),
      ...(job.errorMessage && { error: job.errorMessage }),
    });
  } catch (err) {
    console.error("[vlog/jobId] Failed to query job:", err);
    return NextResponse.json(
      { error: "Failed to query job status" },
      { status: 500 },
    );
  }
}
