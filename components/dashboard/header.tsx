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
    <header className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#030305]/80 backdrop-blur-xl px-6">
      <div />

      <div className="flex items-center gap-4">
        <span className="font-heading text-sm font-medium text-text-secondary tracking-wide">
          {displayName ?? "User"}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-text-muted transition-all duration-200 hover:text-text-primary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
