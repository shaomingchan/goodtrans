"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Languages } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
];

export default function TranslatePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("zh");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceText, setSourceText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !sourceText.trim()) {
      setError("Please upload a txt/md file or paste text to translate");
      return;
    }

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let text = sourceText.trim();

      if (file) {
        const isTextFile = ["text/plain", "text/markdown", "text/x-markdown"].includes(file.type);
        const isPdfFile = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const isSupportedTextExtension = /\.(txt|md)$/i.test(file.name);

        if (isPdfFile) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", file);

          const uploadResponse = await fetch("/api/storage/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload PDF");
          }

          const uploadData = await uploadResponse.json();
          const extractResponse = await fetch("/api/pdf/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfUrl: uploadData.url }),
          });

          if (!extractResponse.ok) {
            throw new Error("Failed to extract text from PDF");
          }

          const extractData = await extractResponse.json();
          text = String(extractData.text || "").trim();
        } else {
          if (!isTextFile && !isSupportedTextExtension) {
            throw new Error("Tonight's flow supports pasted text, .txt, .md, and .pdf files");
          }

          text = (await file.text()).trim();
        }
      }

      if (!text) {
        throw new Error("No text found to translate");
      }

      const response = await fetch("/api/translation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: text,
          sourceLang,
          targetLang,
          email,
        }),
      });

      if (!response.ok) throw new Error("Failed to create translation task");

      const data = await response.json();
      router.push(`/${targetLang}/translate/status?taskId=${data.taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-16">
      <div className="mb-8 text-center">
        <Languages className="mx-auto mb-4 size-12 text-primary" />
        <h1 className="text-3xl font-bold">Professional Translation</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your document and get human-quality translation in 1 hour
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
        <div>
          <Label htmlFor="file">Upload Document</Label>
          <div className="mt-2 flex items-center gap-4">
            <Input
              id="file"
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tonight's runnable flow supports: pasted text, TXT, Markdown, and PDF
          </p>
        </div>

        <div>
          <Label htmlFor="source-text">Or paste text</Label>
          <Textarea
            id="source-text"
            placeholder="Paste the source text here"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="mt-2 min-h-40"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="source">Source Language</Label>
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target">Target Language</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger id="target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We'll notify you when translation is ready
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Submitting..." : "Start Translation →"}
        </Button>
      </form>
    </div>
  );
}
