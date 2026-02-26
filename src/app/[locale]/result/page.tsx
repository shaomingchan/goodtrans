"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Download,
  Link2,
  Twitter,
  Instagram,
  Play,
  Pause,
  RotateCcw,
  Check,
  Film,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const FALLBACK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      // No jobId — use fallback for demo
      setVideoUrl(FALLBACK_VIDEO);
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/vlog/${jobId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load video");
        }
        const job = await res.json();

        if (job.status === "completed" && job.resultUrl) {
          setVideoUrl(job.resultUrl);
        } else if (job.status === "failed") {
          setError(job.error || "Video generation failed");
        } else {
          // Still processing — redirect back
          router.push(`/processing?jobId=${jobId}`);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [jobId, router]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "picmotion-vlog.mp4";
    a.click();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0f0a1a]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-indigo-400" />
          <p className="mt-4 text-sm text-indigo-200/60">Loading your video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0f0a1a] px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto size-8 text-red-400" />
          <p className="mt-4 text-sm text-red-300">{error}</p>
          <Button
            onClick={() => router.push("/create")}
            className="mt-4 gap-2 bg-white/10 hover:bg-white/20"
          >
            <RotateCcw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0f0a1a] px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[#FF6B4A]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
            <Check className="size-3.5" />
            Your Vlog is ready
          </div>
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm"
        >
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              className="h-full w-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              playsInline
              aria-label="Your generated Vlog video"
            />

            {/* Play overlay */}
            {!isPlaying && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
                aria-label="Play video"
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform hover:scale-110">
                  <Play className="ml-1 size-7 text-white" fill="white" />
                </div>
              </motion.button>
            )}
          </div>

          {/* Video controls bar */}
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            <button
              onClick={togglePlay}
              className="text-white/60 transition-colors hover:text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5" />
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Film className="size-3.5" />
              <span>HD 1080p</span>
            </div>
          </div>
        </motion.div>

        {/* Video info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 flex items-start justify-between"
        >
          <div>
            <h1 className="text-lg font-semibold text-white sm:text-xl">
              My Portrait Vlog
            </h1>
            <p className="mt-1 text-sm text-indigo-200/50">
              Generated on {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </motion.div>

        {/* Download button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Button
            size="lg"
            onClick={handleDownload}
            className="h-13 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-[#FF6B4A] text-base font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
          >
            <Download className="mr-2 size-5" />
            Download HD Video
          </Button>
        </motion.div>

        {/* Share buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 grid grid-cols-3 gap-3"
        >
          <ShareButton
            icon={copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            label={copied ? "Copied!" : "Copy Link"}
            onClick={handleCopyLink}
          />
          <ShareButton
            icon={<Twitter className="size-4" />}
            label="Twitter"
            onClick={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=Check out my AI-generated Vlog!&url=${encodeURIComponent(window.location.href)}`,
                "_blank"
              )
            }
          />
          <ShareButton
            icon={<Instagram className="size-4" />}
            label="Instagram"
            onClick={() =>
              window.open("https://instagram.com", "_blank")
            }
          />
        </motion.div>

        {/* Create another */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Button
            variant="ghost"
            onClick={() => router.push("/create")}
            className="gap-2 text-indigo-300/70 hover:bg-white/5 hover:text-indigo-200"
          >
            <RotateCcw className="size-4" />
            Create Another Vlog
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function ShareButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
