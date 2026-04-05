"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ThreadSidebar } from "@/components/coaching/thread-sidebar";
import { NewThreadDialog } from "@/components/coaching/new-thread-dialog";
import type { CoachingThreadWithDeal, Deal, ThreadParticipant } from "@/types/database";

interface CoachShellProps {
  threads: CoachingThreadWithDeal[];
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
  children: React.ReactNode;
}

export function CoachShell({ threads: initialThreads, activeDeals: initialDeals, children }: CoachShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState(initialThreads);
  const [deals, setDeals] = useState(initialDeals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefillDealId, setPrefillDealId] = useState<string | null>(null);
  const [prefillCompany, setPrefillCompany] = useState<string | null>(null);

  // Auto-open new thread dialog when navigating from deal page with ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setPrefillDealId(searchParams.get("deal_id"));
      setPrefillCompany(searchParams.get("company"));
      setDialogOpen(true);
      // Clean up URL params without a full navigation
      router.replace("/coach", { scroll: false });
    }
  }, [searchParams, router]);

  // Derive unique company names from threads + deals for autocomplete
  const knownCompanies = useMemo(() => {
    const names = new Set<string>();
    for (const t of threads) {
      if (t.company) names.add(t.company);
    }
    for (const d of deals) {
      if (d.company) names.add(d.company);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [threads, deals]);

  function handleThreadCreated(thread: {
    thread_id: string;
    title: string;
    contact_name: string | null;
    contact_role: string | null;
    company: string | null;
    participants: ThreadParticipant[];
  }) {
    // Optimistically add the new thread to the list
    const newThread: CoachingThreadWithDeal = {
      thread_id: thread.thread_id,
      user_id: "",
      deal_id: null,
      ma_entity_id: null,
      prospect_id: null,
      meeting_note_id: null,
      project_id: null,
      title: thread.title,
      contact_name: thread.contact_name,
      contact_role: thread.contact_role,
      company: thread.company,
      contact_id: null,
      thread_brief: null,
      brief_updated_at: null,
      catchup_text: null,
      catchup_generated_at: null,
      last_message_at: new Date().toISOString(),
      message_count: 0,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      open_follow_up_count: 0,
      has_overdue: false,
      participants: thread.participants,
    };
    setThreads((prev) => [newThread, ...prev]);
    setDialogOpen(false);
    router.push(`/coach/${thread.thread_id}`);
  }

  const handleArchive = useCallback(async (threadId: string, archive: boolean) => {
    // Optimistic update
    setThreads((prev) =>
      prev.map((t) => t.thread_id === threadId ? { ...t, is_archived: archive } : t)
    );

    const res = await fetch(`/api/coaching/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: archive }),
    });

    if (!res.ok) {
      // Revert on failure
      setThreads((prev) =>
        prev.map((t) => t.thread_id === threadId ? { ...t, is_archived: !archive } : t)
      );
      return;
    }

    // If we archived the currently-viewed thread, navigate to /coach
    const currentThreadId = pathname.split("/coach/")[1];
    if (archive && currentThreadId === threadId) {
      router.push("/coach");
    }
  }, [pathname, router]);

  const handleDelete = useCallback(async (threadId: string) => {
    // Optimistic removal
    const removed = threads.find((t) => t.thread_id === threadId);
    setThreads((prev) => prev.filter((t) => t.thread_id !== threadId));

    const res = await fetch(`/api/coaching/threads/${threadId}`, {
      method: "DELETE",
    });

    if (!res.ok && removed) {
      // Revert on failure
      setThreads((prev) => [...prev, removed]);
      return;
    }

    // If we deleted the currently-viewed thread, navigate to /coach
    const currentThreadId = pathname.split("/coach/")[1];
    if (currentThreadId === threadId) {
      router.push("/coach");
    }
  }, [threads, pathname, router]);

  return (
    <>
      {/* Thread sidebar */}
      <div className="w-64 shrink-0 lg:w-72">
        <ThreadSidebar
          threads={threads}
          onNewThread={() => setDialogOpen(true)}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* New thread dialog */}
      <NewThreadDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setPrefillDealId(null);
          setPrefillCompany(null);
        }}
        onCreated={handleThreadCreated}
        activeDeals={deals}
        onDealCreated={(deal) => setDeals((prev) => [deal, ...prev])}
        knownCompanies={knownCompanies}
        existingThreads={threads}
        prefillDealId={prefillDealId}
        prefillCompany={prefillCompany}
      />
    </>
  );
}
