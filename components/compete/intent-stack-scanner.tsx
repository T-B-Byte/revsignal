"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { IntentStackScanResult } from "@/lib/intel/intent-stack-detector";

interface IntentStackScannerProps {
  open: boolean;
  onClose: () => void;
}

const LIKELIHOOD_COLORS = {
  high: "text-status-red bg-status-red/10 border-status-red/20",
  medium: "text-status-yellow bg-status-yellow/10 border-status-yellow/20",
  low: "text-text-muted bg-surface-tertiary border-border-primary",
  none: "text-text-muted bg-surface-tertiary border-border-primary",
} as const;

const LIKELIHOOD_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None Detected",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  abm: "ABM Platform",
  intent_data: "Intent Data",
  visitor_id: "Visitor ID",
  sales_intel: "Sales Intelligence",
};

export function IntentStackScanner({ open, onClose }: IntentStackScannerProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntentStackScanResult | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleReset() {
    setUrl("");
    setResult(null);
    setError(null);
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      let scanUrl = url.trim();
      if (scanUrl && !scanUrl.startsWith("http")) {
        scanUrl = `https://${scanUrl}`;
      }

      const response = await fetch("/api/intel/intent-stack-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ?? `Scan failed (${response.status})`
        );
      }

      const data: IntentStackScanResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Intent Stack Scanner</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="p-6">
          <p className="mb-4 text-sm text-text-secondary">
            Scan a company&apos;s website to detect ABM and intent data platform
            tags. Infers whether they&apos;re likely consuming Bombora (or
            competing) intent data.
          </p>

          <form onSubmit={handleScan} className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., acme.com or https://acme.com"
              required
              className="flex-1 rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
            <Button type="submit" loading={loading} disabled={loading}>
              {loading ? "Scanning..." : "Scan"}
            </Button>
          </form>

          {error && (
            <div className="mt-4 rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              {/* Bombora Likelihood Banner */}
              <div
                className={`rounded-lg border p-4 ${LIKELIHOOD_COLORS[result.bomboraLikelihood]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Bombora Likelihood
                  </span>
                  <span className="rounded-full border border-current/20 px-2.5 py-0.5 text-xs font-medium">
                    {LIKELIHOOD_LABELS[result.bomboraLikelihood]}
                  </span>
                </div>
                <p className="mt-1 text-sm opacity-90">
                  {result.bomboraExplanation}
                </p>
              </div>

              {/* Detected Platforms */}
              {result.platforms.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    Detected Platforms ({result.totalDetected})
                  </h3>
                  <div className="space-y-2">
                    {result.platforms.map((platform, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border-primary bg-surface-tertiary p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-sm font-medium text-text-primary">
                              {platform.name}
                            </span>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-muted">
                                {CATEGORY_LABELS[platform.category] ??
                                  platform.category}
                              </span>
                              {platform.bundlesBombora && (
                                <span className="rounded-full bg-status-red/10 px-2 py-0.5 text-[10px] font-medium text-status-red">
                                  Bundles Bombora
                                </span>
                              )}
                              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-muted">
                                {platform.confidence === "high"
                                  ? "High confidence"
                                  : "Medium confidence"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-text-secondary">
                          {platform.bomboraRelationship}
                        </p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          Matched:{" "}
                          {platform.matchedPatterns.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border-primary bg-surface-tertiary p-4 text-center">
                  <p className="text-sm text-text-muted">
                    No intent/ABM platform tags detected on this site.
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    They may still consume intent data via server-side
                    integrations (API feeds, CSV imports) which aren&apos;t
                    visible in page HTML.
                  </p>
                </div>
              )}

              {/* Scan metadata */}
              <div className="flex items-center justify-between border-t border-border-primary pt-3">
                <p className="text-[10px] text-text-muted">
                  Scanned {result.url} at{" "}
                  {new Date(result.scannedAt).toLocaleString()}
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs font-medium text-accent-primary hover:underline"
                >
                  Scan another
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
