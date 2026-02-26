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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="text-center" role="status" aria-label="Loading video">
          <Loader2 className="mx-auto size-8 animate-spin text-accent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/30 to-background px-4">
        <div className="text-center" role="alert">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <p className="mt-4 text-sm text-destructive/80">{error}</p>
          <Button
            variant="secondary"
            onClick={() => router.push("/create")}
            className="mt-4 gap-2"
            aria-label="Retry video generation"
          >
            <RotateCcw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-muted/30 to-background px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-primary/[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <Check className="size-3.5" />
            Your Vlog is ready
          </div>
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-2xl shadow-accent/10 backdrop-blur-sm"
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
                <div className="flex size-16 items-center justify-center rounded-full bg-foreground/15 backdrop-blur-sm transition-transform hover:scale-110">
                  <Play className="ml-1 size-7 text-foreground" fill="currentColor" />
                </div>
              </motion.button>
            )}
          </div>

          {/* Video controls bar */}
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
            <button
              onClick={togglePlay}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5" />
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
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
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">
              My Portrait Vlog
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
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
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent via-accent/70 to-primary text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:brightness-110"
            aria-label="Download HD video"
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
            className="gap-2 text-accent/70 hover:bg-muted/50 hover:text-accent"
            aria-label="Create another vlog"
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
      className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm text-muted-foreground transition-all hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
