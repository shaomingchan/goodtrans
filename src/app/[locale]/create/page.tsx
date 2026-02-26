"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  ImagePlus,
  GripVertical,
  Film,
  Heart,
  Plane,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
}

interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 15;

const STYLES: StyleOption[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Dramatic lighting, film grain, widescreen feel",
    icon: <Film className="size-6" />,
    gradient: "from-amber-500/20 via-orange-500/10 to-red-500/20",
  },
  {
    id: "romantic",
    name: "Romantic",
    description: "Soft tones, warm glow, dreamy transitions",
    icon: <Heart className="size-6" />,
    gradient: "from-pink-500/20 via-rose-500/10 to-fuchsia-500/20",
  },
  {
    id: "travel",
    name: "Travel",
    description: "Vibrant colors, dynamic cuts, adventure vibes",
    icon: <Plane className="size-6" />,
    gradient: "from-cyan-500/20 via-blue-500/10 to-indigo-500/20",
  },
];

// ─── Sortable Photo Thumbnail ────────────────────────────────────────────────

function SortablePhoto({
  photo,
  onRemove,
}: {
  photo: PhotoFile;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/30",
        isDragging && "z-50 shadow-2xl ring-2 ring-primary/50"
      )}
    >
      <img
        src={photo.preview}
        alt="Upload preview"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 cursor-grab rounded-md bg-black/50 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5 text-white" />
      </div>
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(photo.id)}
        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive/80 group-hover:opacity-100"
        aria-label={`Remove photo`}
      >
        <X className="size-3.5 text-white" />
      </button>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>("cinematic");
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const photoIds = useMemo(() => photos.map((p) => p.id), [photos]);

  // ─── File Handling ───────────────────────────────────────────────────────

  const validateAndAddFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);
      const validFiles: PhotoFile[] = [];

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Only JPG, PNG, and WEBP files are accepted.");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError("Each file must be under 10MB.");
          continue;
        }
        if (photos.length + validFiles.length >= MAX_PHOTOS) {
          setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
          break;
        }
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }

      if (validFiles.length > 0) {
        setPhotos((prev) => [...prev, ...validFiles]);
      }
    },
    [photos.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndAddFiles(e.target.files);
        e.target.value = "";
      }
    },
    [validateAndAddFiles]
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPhotos((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // ─── Upload & Create Vlog ────────────────────────────────────────────

  const handleCreateVlog = useCallback(async () => {
    if (photos.length < MIN_PHOTOS || isUploading) return;
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URLs
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: photos.length }),
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get upload URLs");
      }

      const { urls } = await uploadRes.json() as {
        sessionId: string;
        urls: { index: number; key: string; uploadUrl: string; publicUrl: string }[];
      };

      // Step 2: Upload each photo to R2 via presigned URL
      const publicUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const urlInfo = urls[i];

        const putRes = await fetch(urlInfo.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: photo.file,
        });

        if (!putRes.ok) {
          throw new Error(`Failed to upload photo ${i + 1}`);
        }

        publicUrls.push(urlInfo.publicUrl);
        setUploadProgress(Math.round(((i + 1) / photos.length) * 90));
      }

      // Step 3: Create vlog job
      setUploadProgress(95);
      const vlogRes = await fetch("/api/vlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrls: publicUrls, style: selectedStyle }),
      });

      if (!vlogRes.ok) {
        const data = await vlogRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create vlog job");
      }

      const { jobId } = await vlogRes.json() as { jobId: string };
      setUploadProgress(100);

      // Step 4: Navigate to processing page
      router.push(`/processing?jobId=${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [photos, selectedStyle, isUploading, router]);

  // ─── Derived State ─────────────────────────────────────────────────────

  const canGenerate = photos.length >= MIN_PHOTOS && !isUploading;
  const photosNeeded = MIN_PHOTOS - photos.length;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="size-4" />
            AI-Powered Vlog Creator
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Create Your Vlog
          </h1>
          <p className="mt-3 text-muted-foreground">
            Upload your photos, pick a style, and let AI craft a stunning
            2-minute portrait Vlog.
          </p>
        </motion.div>

        {/* Step 1: Photo Upload */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                1
              </span>
              Upload Photos
            </h2>
            <span className="text-sm text-muted-foreground">
              {photos.length}/{MAX_PHOTOS} photos
              {photos.length < MIN_PHOTOS && (
                <span className="ml-1 text-primary">
                  (need {photosNeeded} more)
                </span>
              )}
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300",
              isDragOver
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
              photos.length === 0 ? "py-16" : "p-4"
            )}
            role="button"
            tabIndex={0}
            aria-label="Upload photos by clicking or dragging"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />

            {photos.length === 0 ? (
              <motion.div
                className="flex flex-col items-center gap-4"
                animate={isDragOver ? { scale: 1.02 } : { scale: 1 }}
              >
                <div className="rounded-2xl bg-primary/10 p-4">
                  <Upload className="size-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">
                    Drag & drop your photos here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse · JPG, PNG, WEBP · Max 10MB each
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {MIN_PHOTOS}–{MAX_PHOTOS} photos required
                  </p>
                </div>
              </motion.div>
            ) : (
              <div onClick={(e) => e.stopPropagation()}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={photoIds}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      <AnimatePresence mode="popLayout">
                        {photos.map((photo) => (
                          <SortablePhoto
                            key={photo.id}
                            photo={photo}
                            onRemove={removePhoto}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Add more button */}
                      {photos.length < MAX_PHOTOS && (
                        <motion.button
                          type="button"
                          layout
                          onClick={() => fileInputRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                          aria-label="Add more photos"
                        >
                          <ImagePlus className="size-6" />
                          <span className="text-xs">Add</span>
                        </motion.button>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Step 2: Style Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="mb-4 text-lg font-semibold">
            <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              2
            </span>
            Choose a Style
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {STYLES.map((style) => (
              <motion.button
                key={style.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStyle(style.id)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300",
                  selectedStyle === style.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/50 bg-muted/20 hover:border-primary/30"
                )}
                aria-pressed={selectedStyle === style.id}
                aria-label={`Select ${style.name} style`}
              >
                {/* Gradient background */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-50",
                    style.gradient
                  )}
                />

                <div className="relative">
                  <div
                    className={cn(
                      "mb-3 inline-flex rounded-xl p-2.5 transition-colors",
                      selectedStyle === style.id
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {style.icon}
                  </div>
                  <h3 className="font-semibold">{style.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {style.description}
                  </p>
                </div>

                {/* Selected indicator */}
                {selectedStyle === style.id && (
                  <motion.div
                    layoutId="style-indicator"
                    className="absolute right-3 top-3 size-3 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Step 3: Generate Button */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          {/* Upload progress bar */}
          {isUploading && (
            <div className="mb-4">
              <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {uploadProgress < 90
                  ? `Uploading photos... ${uploadProgress}%`
                  : uploadProgress < 100
                    ? "Creating your vlog..."
                    : "Redirecting..."}
              </p>
            </div>
          )}

          <Button
            size="lg"
            disabled={!canGenerate}
            onClick={handleCreateVlog}
            className={cn(
              "h-14 rounded-2xl px-10 text-base font-semibold transition-all duration-300",
              canGenerate
                ? "bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                : ""
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-5" />
                Create My Vlog — $19.9
              </>
            )}
          </Button>
          {!canGenerate && !isUploading && (
            <p className="mt-3 text-sm text-muted-foreground">
              Upload at least {MIN_PHOTOS} photos to get started
            </p>
          )}
        </motion.section>
      </div>
    </div>
  );
}
