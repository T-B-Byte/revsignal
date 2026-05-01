"use client";

import { useState, FormEvent } from "react";

interface UnlockData {
  log_id: string | null;
  room: Record<string, unknown>;
  products: Record<string, unknown>[];
}

interface PasswordGateProps {
  slug: string;
  onUnlock: (data: UnlockData, password: string) => void;
}

export function PasswordGate({ slug, onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/room/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.status === 401) {
        setError("Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      if (res.status === 404) {
        setError("This deal room does not exist or is no longer active.");
        setLoading(false);
        return;
      }

      if (res.status === 410) {
        setError("This deal room has expired.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      onUnlock(data, password);
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <img
            src="/PharosIQ Logo_pharosIQ-White Wordmark.svg"
            alt="pharosIQ"
            className="mx-auto mb-6 h-20 w-auto"
          />
          <h1 className="text-lg font-medium text-zinc-400">Deal Room</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter the password to access your personalized data solutions package.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="room-password" className="sr-only">
              Password
            </label>
            <input
              id="room-password"
              type="password"
              autoFocus
              autoComplete="off"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Access Deal Room"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Powered by pharosIQ Data Solutions
        </p>
      </div>
    </div>
  );
}
