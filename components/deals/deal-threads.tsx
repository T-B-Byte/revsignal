"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type { CoachingThread, CoachingMessage } from "@/types/database";

type ThreadSummary = Pick<
  CoachingThread,
  | "thread_id"
  | "title"
  | "last_message_at"
  | "message_count"
  | "is_archived"
> & {
  open_follow_up_count?: number;
  has_overdue?: boolean;
};

interface DealThreadsProps {
  threads: ThreadSummary[];
  dealId: string;
  company: string;
}

/** Compact inline view of a single thread's recent messages */
function ThreadInline({
  thread,
  onCollapse,
}: {
  thread: ThreadSummary;
  onCollapse: () => void;
}) {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages?limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [thread.thread_id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, interaction_type: "coaching" }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send message.");
        return;
      }

      const data = await res.json();

      // The API returns different shapes for coaching vs non-coaching
      if (data.response) {
        // Coaching mode: response + userConversationId + assistantConversationId
        // Re-fetch to get the saved messages
        await fetchMessages();
      } else if (data.message) {
        // Non-coaching: just the saved message
        setMessages((prev) => [...prev, data.message]);
      }

      setInput("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-border-primary rounded-md overflow-hidden">
      {/* Thread header */}
      <div className="flex items-center justify-between bg-surface-secondary px-3 py-2 border-b border-border-primary">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">
            {thread.title}
          </h4>
          {thread.has_overdue && <Badge variant="red">Overdue</Badge>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href={`/coach/${thread.thread_id}`}
            className="text-xs text-accent-primary hover:underline"
          >
            Open full thread
          </Link>
          <button
            onClick={onCollapse}
            className="ml-1 text-text-muted hover:text-text-primary transition-colors p-0.5"
            title="Collapse"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="max-h-80 overflow-y-auto px-3 py-2 space-y-3">
        {loading ? (
          <p className="text-xs text-text-muted text-center py-4">
            Loading conversation...
          </p>
        ) : fetchError ? (
          <div className="text-center py-4">
            <p className="text-xs text-status-red">
              Could not load messages.
            </p>
            <button
              onClick={fetchMessages}
              className="mt-1 text-xs text-accent-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.conversation_id}
              className={`text-sm ${
                msg.role === "assistant"
                  ? "pl-3 border-l-2 border-accent-primary/30"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`text-xs font-medium ${
                    msg.role === "assistant"
                      ? "text-accent-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {msg.role === "assistant" ? "Strategist" : "You"}
                </span>
                <span className="text-xs text-text-muted">
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {msg.role === "assistant" ? (
                <div
                  className="text-sm text-text-secondary leading-relaxed prose-compact"
                  dangerouslySetInnerHTML={{
                    __html: formatAgentHtml(msg.content),
                  }}
                />
              ) : (
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {msg.content}
                </p>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-border-primary px-3 py-2">
        {error && <p className="text-xs text-status-red mb-1.5">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the Strategist..."
            maxLength={10000}
            disabled={sending}
            className="flex-1 rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={handleSend}
            loading={sending}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DealThreads({ threads, dealId, company }: DealThreadsProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeThreads = threads.filter((t) => !t.is_archived);
  const archivedCount = threads.length - activeThreads.length;

  function handleNewThread() {
    const params = new URLSearchParams({
      new: "1",
      deal_id: dealId,
      company,
    });
    router.push(`/coach?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            StrategyGPT
            {activeThreads.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({activeThreads.length})
              </span>
            )}
          </CardTitle>
          <Button variant="secondary" size="sm" onClick={handleNewThread}>
            + Thread
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeThreads.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-text-muted">
              No StrategyGPT threads linked to this deal yet.
            </p>
            <button
              onClick={handleNewThread}
              className="mt-2 text-xs text-accent-primary hover:underline"
            >
              Start a coaching conversation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeThreads.map((thread) =>
              expandedId === thread.thread_id ? (
                <ThreadInline
                  key={thread.thread_id}
                  thread={thread}
                  onCollapse={() => setExpandedId(null)}
                />
              ) : (
                <button
                  key={thread.thread_id}
                  onClick={() => setExpandedId(thread.thread_id)}
                  className="w-full flex items-start justify-between gap-3 rounded-md px-3 py-2.5 -mx-3 hover:bg-surface-tertiary transition-colors text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                      {thread.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {thread.message_count} message
                        {thread.message_count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatDistanceToNow(
                          new Date(thread.last_message_at),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    {thread.has_overdue && <Badge variant="red">Overdue</Badge>}
                    {!thread.has_overdue &&
                      (thread.open_follow_up_count ?? 0) > 0 && (
                        <Badge variant="yellow">
                          {thread.open_follow_up_count} follow-up
                          {(thread.open_follow_up_count ?? 0) !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-text-muted"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>
              )
            )}
          </div>
        )}
        {archivedCount > 0 && (
          <p className="mt-3 text-xs text-text-muted text-center">
            + {archivedCount} archived thread
            {archivedCount !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
