"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AnalyzeTradeshowFormProps {
  onClose: () => void;
}

export function AnalyzeTradeshowForm({ onClose }: AnalyzeTradeshowFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sponsorPageUrl, setSponsorPageUrl] = useState("");
  const [dates, setDates] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStatus("Creating tradeshow...");

    try {
      const res = await fetch("/api/agents/tradeshow-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sponsorPageUrl,
          dates: dates || undefined,
          location: location || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start analysis");
      }

      const { tradeshowId } = await res.json();
      setStatus("Analyzing sponsors...");

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes at 3s intervals

      const poll = async () => {
        while (attempts < maxAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 3000));

          const pollRes = await fetch(`/api/tradeshows/${tradeshowId}`);
          if (!pollRes.ok) continue;

          const data = await pollRes.json();
          const tradeshowStatus = data.tradeshow?.status;

          if (tradeshowStatus === "complete") {
            setStatus("Complete!");
            router.push(`/tradeshows/${tradeshowId}`);
            router.refresh();
            return;
          }

          if (tradeshowStatus === "partial") {
            setStatus("Classifying targets...");
          }

          if (tradeshowStatus === "error") {
            throw new Error(
              data.tradeshow?.analysis_summary || "Analysis failed"
            );
          }
        }

        throw new Error("Analysis timed out. Check the tradeshows page for results.");
      };

      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
      setStatus(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border-primary bg-surface-primary p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Analyze Tradeshow
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="B2BMX 2026"
              required
              disabled={isSubmitting}
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Sponsor Page URL *
            </label>
            <input
              type="url"
              value={sponsorPageUrl}
              onChange={(e) => setSponsorPageUrl(e.target.value)}
              placeholder="https://example.com/sponsors"
              required
              disabled={isSubmitting}
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Dates
              </label>
              <input
                type="text"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="March 9-11, 2026"
                disabled={isSubmitting}
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Carlsbad, CA"
                disabled={isSubmitting}
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {status && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
              {status}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !sponsorPageUrl}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
