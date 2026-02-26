"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="glass rounded-lg p-8 text-center">
        <h2 className="mb-2 text-lg font-semibold text-text-primary">
          Check your email
        </h2>
        <p className="text-sm text-text-secondary">
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-accent-primary hover:text-accent-secondary"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-8">
      <h2 className="mb-6 text-lg font-semibold text-text-primary">
        Reset password
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-status-red-bg p-3 text-sm text-status-red">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link
          href="/login"
          className="text-accent-primary hover:text-accent-secondary"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
