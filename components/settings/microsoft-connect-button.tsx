"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MicrosoftConnectButton({
  isConnected,
  connectedAt,
}: {
  isConnected: boolean;
  connectedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/microsoft");
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to start Microsoft connection");
        return;
      }
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch {
      alert("Failed to start Microsoft connection");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Microsoft? Calendar sync and email ingestion will stop.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/microsoft", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to disconnect");
      }
    } catch {
      alert("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        {connectedAt && (
          <span className="text-xs text-text-muted">
            Since {new Date(connectedAt).toLocaleDateString()}
          </span>
        )}
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect"}
    </button>
  );
}
