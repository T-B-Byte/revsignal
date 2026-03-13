"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMaDocument } from "@/app/(dashboard)/ma/actions";
import type { MaDocument } from "@/types/database";

interface MaDocumentUploadProps {
  entityId: string;
  documents: MaDocument[];
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ready", color: "#6b7280" },
  analyzing: { label: "Analyzing...", color: "#eab308" },
  complete: { label: "Reviewed", color: "#22c55e" },
  failed: { label: "Failed", color: "#ef4444" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaDocumentUpload({
  entityId,
  documents,
}: MaDocumentUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("File type not allowed. Use PDF, JPEG, PNG, or WebP.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/ma/${entityId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Upload failed");
        return;
      }

      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAnalyze(documentId: string) {
    setError(null);
    setAnalyzing(documentId);

    try {
      const res = await fetch(
        `/api/ma/${entityId}/documents/${documentId}/analyze`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Analysis failed");
        return;
      }

      router.refresh();
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(null);
    }
  }

  async function handleDownload(doc: MaDocument) {
    try {
      const res = await fetch(
        `/api/ma/${entityId}/documents/${doc.document_id}/download`
      );
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      setError("Failed to open document.");
    }
  }

  function handleDelete(documentId: string) {
    if (!confirm("Delete this document?")) return;
    startTransition(async () => {
      const result = await deleteMaDocument(documentId);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-primary bg-surface-tertiary p-4 transition-colors hover:border-accent-primary/40"
        >
          <svg
            className="h-6 w-6 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-xs text-text-muted">
            Drop a slide deck or file here
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          >
            {uploading ? "Uploading..." : "Choose File"}
          </Button>
          <p className="text-[10px] text-text-muted">
            PDF, JPEG, PNG, WebP — up to 20MB
          </p>
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => {
              const status = STATUS_LABELS[doc.analysis_status] ?? STATUS_LABELS.pending;
              const isAnalyzing = analyzing === doc.document_id;
              const canAnalyze =
                doc.analysis_status === "pending" ||
                doc.analysis_status === "failed";

              return (
                <div
                  key={doc.document_id}
                  className="flex items-center gap-3 rounded-md border border-border-primary bg-surface-secondary p-2.5"
                >
                  {/* File icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-tertiary">
                    {doc.mime_type === "application/pdf" ? (
                      <svg
                        className="h-4 w-4 text-status-red"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13H10v1H8.5v1.5H7.5V13h1zm3 0h1.5v.8H12v.5h.8v.7H12v1.5h-1V13h.5zm3.5 0h2v.8h-1.2v.5h1v.7h-1v1.5H15V13z" />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-accent-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="block truncate text-xs font-medium text-text-primary hover:text-accent-primary transition-colors text-left"
                      title={`Download ${doc.filename}`}
                    >
                      {doc.filename}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-muted">
                        {formatFileSize(doc.file_size)}
                      </span>
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          color: status.color,
                          backgroundColor: `${status.color}15`,
                        }}
                      >
                        {isAnalyzing ? "Analyzing..." : status.label}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatDistanceToNow(new Date(doc.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {canAnalyze && (
                      <button
                        onClick={() => handleAnalyze(doc.document_id)}
                        disabled={isAnalyzing || isPending}
                        className="rounded-md px-2 py-1 text-[10px] font-medium text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors disabled:opacity-50"
                        title="Run strategic assessment"
                      >
                        {isAnalyzing ? "..." : "Assess"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc.document_id)}
                      disabled={isPending || isAnalyzing}
                      className="rounded-md p-1 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors disabled:opacity-50"
                      title="Delete document"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
