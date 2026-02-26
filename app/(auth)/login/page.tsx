"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleMicrosoftSSO() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email profile openid",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-lg p-8">
      <h2 className="mb-6 text-lg font-semibold text-text-primary">Sign in</h2>

      {error && (
        <div className="mb-4 rounded-md bg-status-red-bg p-3 text-sm text-status-red">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-primary" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-border-primary" />
      </div>

      <button
        onClick={handleMicrosoftSSO}
        disabled={loading}
        className="w-full rounded-md border border-border-primary bg-surface-tertiary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover disabled:opacity-50"
      >
        Continue with Microsoft
      </button>

      <div className="mt-6 flex justify-between text-sm">
        <Link
          href="/signup"
          className="text-accent-primary hover:text-accent-secondary"
        >
          Create account
        </Link>
        <Link
          href="/reset-password"
          className="text-text-muted hover:text-text-secondary"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
