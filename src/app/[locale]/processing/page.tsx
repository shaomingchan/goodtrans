"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Check, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type JobStatus = "pending" | "processing" | "completed" | "failed";

interface JobResponse {
  jobId: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  resultUrl?: string;
  error?: string;
}

const STEPS = [
  { id: 1, label: "Analyzing photos" },
  { id: 2, label: "Generating scenes" },
  { id: 3, label: "Creating video" },
  { id: 4, label: "Adding music" },
  { id: 5, label: "Finalizing" },
];

/** Map backend status to a visual step index + progress */
function statusToProgress(status: JobStatus, elapsed: number): { step: number; progress: number } {
  switch (status) {
    case "pending":
      return { step: 0, progress: Math.min(10, elapsed / 1000) };
    case "processing": {
      // Simulate gradual progress while processing (10-90%)
      const pct = Math.min(90, 10 + (elapsed / 1000) * 0.5);
      const stepIdx = Math.min(Math.floor(pct / 20), STEPS.length - 1);
      return { step: stepIdx, progress: pct };
    }
    case "completed":
      return { step: STEPS.length, progress: 100 };
    case "failed":
      return { step: -1, progress: 0 };
    default:
      return { step: 0, progress: 0 };
  }
}

export default function ProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const pollJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/vlog/${jobId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch job status");
      }
      const job: JobResponse = await res.json();
      setJobStatus(job.status);

      const elapsed = Date.now() - startTime;
      const { step, progress: pct } = statusToProgress(job.status, elapsed);
      setCurrentStep(step);
      setProgress(pct);

      if (job.status === "completed") {
        setTimeout(() => router.push(`/result?jobId=${jobId}`), 800);
      } else if (job.status === "failed") {
        setErrorMsg(job.error || "Video generation failed. Please try again.");
      }

      return job.status;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Connection error");
      return "failed" as JobStatus;
    }
  }, [jobId, startTime, router]);

  useEffect(() => {
    if (!jobId) {
      router.push("/create");
      return;
    }

    // Initial poll
    pollJob();

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      const status = await pollJob();
      if (status === "completed" || status === "failed") {
        clearInterval(interval);
      }
    }, 3000);

    // Smooth progress animation between polls
    const progressTick = setInterval(() => {
      if (jobStatus === "pending" || jobStatus === "processing") {
        const elapsed = Date.now() - startTime;
        const { step, progress: pct } = statusToProgress(jobStatus, elapsed);
        setCurrentStep(step);
        setProgress(pct);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(progressTick);
    };
  }, [jobId, router, pollJob, jobStatus, startTime]);

  const handleRetry = () => {
    router.push("/create");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0f0a1a] px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-[#FF6B4A]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Film strip animation */}
        <FilmStripAnimation progress={progress} />

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {jobStatus === "failed" ? "Generation Failed" : "Creating your Vlog..."}
          </h1>
          <p className="mt-2 text-sm text-indigo-200/60">
            {jobStatus === "failed"
              ? "Something went wrong"
              : "Estimated time: 3–5 minutes"}
          </p>
        </motion.div>

        {/* Error state */}
        {jobStatus === "failed" && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center"
          >
            <AlertCircle className="mx-auto mb-2 size-6 text-red-400" />
            <p className="text-sm text-red-300">{errorMsg}</p>
            <Button
              onClick={handleRetry}
              className="mt-4 gap-2 bg-white/10 hover:bg-white/20"
            >
              <RotateCcw className="size-4" />
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Progress bar (only when not failed) */}
        {jobStatus !== "failed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-[#FF6B4A]"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-indigo-200/50">
              {Math.round(progress)}%
            </p>
          </motion.div>
        )}

        {/* Steps (only when not failed) */}
        {jobStatus !== "failed" && (
          <div className="mt-8 space-y-3">
            {STEPS.map((step, i) => (
              <StepItem
                key={step.id}
                label={step.label}
                state={
                  currentStep > i
                    ? "done"
                    : currentStep === i
                      ? "active"
                      : "pending"
                }
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({
  label,
  state,
  index,
}: {
  label: string;
  state: "pending" | "active" | "done";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      className="flex items-center gap-3"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10">
        <AnimatePresence mode="wait">
          {state === "done" ? (
            <motion.div
              key="done"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20"
            >
              <Check className="size-3.5 text-emerald-400" />
            </motion.div>
          ) : state === "active" ? (
            <motion.div
              key="active"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex size-7 items-center justify-center rounded-full bg-indigo-500/20"
            >
              <Loader2 className="size-3.5 animate-spin text-indigo-400" />
            </motion.div>
          ) : (
            <div className="size-2 rounded-full bg-white/20" />
          )}
        </AnimatePresence>
      </div>
      <span
        className={
          state === "done"
            ? "text-sm text-emerald-300/80"
            : state === "active"
              ? "text-sm font-medium text-white"
              : "text-sm text-white/30"
        }
      >
        {label}
      </span>
    </motion.div>
  );
}

function FilmStripAnimation({ progress }: { progress: number }) {
  const frameCount = 8;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        {/* Sprocket holes top */}
        <div className="mb-2 flex justify-between px-1">
          {Array.from({ length: frameCount }).map((_, i) => (
            <div key={`top-${i}`} className="size-2 rounded-sm bg-white/15" />
          ))}
        </div>

        {/* Film frames */}
        <div className="flex gap-1.5">
          {Array.from({ length: frameCount }).map((_, i) => {
            const frameProgress = (progress / 100) * frameCount;
            const isLit = i < frameProgress;
            const isCurrent = i === Math.floor(frameProgress) && i < frameCount;

            return (
              <motion.div
                key={i}
                className="relative h-12 w-10 overflow-hidden rounded-sm sm:h-16 sm:w-12"
                animate={{
                  backgroundColor: isLit
                    ? "rgba(99, 102, 241, 0.3)"
                    : "rgba(255, 255, 255, 0.05)",
                  borderColor: isCurrent
                    ? "rgba(255, 107, 74, 0.6)"
                    : "rgba(255, 255, 255, 0.1)",
                }}
                style={{ border: "1px solid" }}
                transition={{ duration: 0.4 }}
              >
                {isLit && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Film className="size-4 text-indigo-300/60" />
                  </motion.div>
                )}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 bg-[#FF6B4A]/10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Sprocket holes bottom */}
        <div className="mt-2 flex justify-between px-1">
          {Array.from({ length: frameCount }).map((_, i) => (
            <div key={`bot-${i}`} className="size-2 rounded-sm bg-white/15" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
