"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ImageUploadProps {
  /** Existing card ID — upload updates the card directly */
  cardId?: string;
  /** Current image URL (shows preview) */
  currentUrl?: string | null;
  /** Called when upload succeeds with the new URL */
  onUploaded?: (url: string) => void;
  /** For new cards: returns the File for the parent to upload after card creation */
  onFileSelected?: (file: File) => void;
  /** Size variant */
  size?: "sm" | "md";
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export function ImageUpload({
  cardId,
  currentUrl,
  onUploaded,
  onFileSelected,
  size = "md",
}: ImageUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use JPEG, PNG, WebP, or GIF");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Max 5MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // If no cardId yet (new card flow), just pass the file up
    if (!cardId) {
      onFileSelected?.(file);
      return;
    }

    // Upload to existing card
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cardId", cardId);

      const res = await fetch("/api/flashcards/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        setPreview(currentUrl ?? null);
        return;
      }

      const { image_url } = await res.json();
      setPreview(image_url);
      onUploaded?.(image_url);
      router.refresh();
    } catch {
      setError("Upload failed");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const dim = size === "sm" ? "h-16 w-16" : "h-24 w-24";
  const iconDim = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />

      {/* Preview / upload target */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        disabled={uploading}
        className={`relative ${dim} rounded-full border-2 border-dashed border-border-primary bg-surface-primary hover:border-accent-primary hover:bg-surface-tertiary transition-colors overflow-hidden flex items-center justify-center shrink-0`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </>
        ) : uploading ? (
          <svg className={`${iconDim} text-text-muted animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
          </svg>
        ) : (
          <svg className={`${iconDim} text-text-muted`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        )}
      </button>

      <div className="text-xs">
        {uploading ? (
          <p className="text-text-muted">Uploading...</p>
        ) : error ? (
          <p className="text-status-red">{error}</p>
        ) : (
          <p className="text-text-muted">
            {preview ? "Click to change" : "Upload photo"}
          </p>
        )}
      </div>
    </div>
  );
}
