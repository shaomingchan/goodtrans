"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function TranslateStatusPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/translate/${taskId}`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [taskId]);

  if (error) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 size-12 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-16">
      <div className="text-center">
        {status.status === "completed" ? (
          <>
            <CheckCircle className="mx-auto mb-4 size-12 text-green-500" />
            <h1 className="text-2xl font-bold">Translation Complete!</h1>
            <p className="mt-2 text-muted-foreground">
              Check your email for the download link
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-4 size-12 animate-spin text-primary" />
            <h1 className="text-2xl font-bold">Translating...</h1>
            <p className="mt-2 text-muted-foreground">
              Round {status.currentRound}/{status.totalRounds}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
