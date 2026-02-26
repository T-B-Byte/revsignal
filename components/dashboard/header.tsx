"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({ displayName }: { displayName?: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-primary bg-surface-secondary px-6">
      <div />

      <div className="flex items-center gap-4">
        <span className="text-sm text-text-secondary">
          {displayName ?? "User"}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
