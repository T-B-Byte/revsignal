"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThreadSidebar } from "@/components/coaching/thread-sidebar";
import { NewThreadDialog } from "@/components/coaching/new-thread-dialog";
import type { CoachingThreadWithDeal, Deal } from "@/types/database";

interface CoachShellProps {
  threads: CoachingThreadWithDeal[];
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
  children: React.ReactNode;
}

export function CoachShell({ threads: initialThreads, activeDeals, children }: CoachShellProps) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleThreadCreated(thread: {
    thread_id: string;
    title: string;
    contact_name: string | null;
    contact_role: string | null;
    company: string | null;
  }) {
    // Optimistically add the new thread to the list
    const newThread: CoachingThreadWithDeal = {
      thread_id: thread.thread_id,
      user_id: "",
      deal_id: null,
      title: thread.title,
      contact_name: thread.contact_name,
      contact_role: thread.contact_role,
      company: thread.company,
      contact_id: null,
      thread_brief: null,
      brief_updated_at: null,
      last_message_at: new Date().toISOString(),
      message_count: 0,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      open_follow_up_count: 0,
      has_overdue: false,
    };
    setThreads((prev) => [newThread, ...prev]);
    setDialogOpen(false);
    router.push(`/coach/${thread.thread_id}`);
  }

  return (
    <>
      {/* Thread sidebar */}
      <div className="w-64 shrink-0 lg:w-72">
        <ThreadSidebar
          threads={threads}
          onNewThread={() => setDialogOpen(true)}
        />
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* New thread dialog */}
      <NewThreadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleThreadCreated}
        activeDeals={activeDeals}
      />
    </>
  );
}
