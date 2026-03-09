"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";
import { ThreadCatchup } from "./thread-catchup";
import { ThreadFollowUps } from "./thread-follow-ups";
import type { CoachingMessage, CoachingThread } from "@/types/database";

interface ThreadChatProps {
  thread: CoachingThread;
  initialMessages: CoachingMessage[];
  dealCompany?: string | null;
}

export function ThreadChat({
  thread,
  initialMessages,
  dealCompany,
}: ThreadChatProps) {
  const [messages, setMessages] = useState<CoachingMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpKey, setFollowUpKey] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinningId, setPinningId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset state when thread changes
  useEffect(() => {
    setMessages(initialMessages);
    setError(null);
    setInput("");
  }, [thread.thread_id, initialMessages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading || sendingRef.current) return;
    sendingRef.current = true;

    setError(null);
    setInput("");

    // Optimistic user message
    const userMsg: CoachingMessage = {
      conversation_id: crypto.randomUUID(),
      user_id: "",
      thread_id: thread.thread_id,
      role: "user",
      content: trimmed,
      context_used: null,
      sources_cited: [],
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to get response.");
        setMessages((prev) =>
          prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
        );
        setInput((prev) => prev || trimmed);
        return;
      }

      const data = await res.json();

      const assistantMsg: CoachingMessage = {
        conversation_id: crypto.randomUUID(),
        user_id: "",
        thread_id: thread.thread_id,
        role: "assistant",
        content: data.response,
        context_used: null,
        sources_cited: [],
        tokens_used: data.tokensUsed,
        created_at: data.generatedAt,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If follow-ups were extracted, refresh the follow-ups panel
      if (data.followUpsExtracted?.length > 0) {
        setFollowUpKey((k) => k + 1);
      }
    } catch {
      setError("Network error. Please try again.");
      setMessages((prev) =>
        prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
      );
      setInput((prev) => prev || trimmed);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  async function handlePin(msg: CoachingMessage) {
    if (pinnedIds.has(msg.conversation_id) || pinningId) return;
    setPinningId(msg.conversation_id);

    try {
      // Truncate content for the title (first line or first 100 chars)
      const firstLine = msg.content.split("\n")[0].replace(/[#*_`]/g, "").trim();
      const title = firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;

      const res = await fetch("/api/strategic-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "strategic_observation",
          title: title || "Pinned from coaching thread",
          content: msg.content,
          related_deal_id: thread.deal_id || undefined,
          source: `Coaching thread: ${thread.title}`,
          tags: ["pinned", "coaching"],
        }),
      });

      if (res.ok) {
        setPinnedIds((prev) => new Set(prev).add(msg.conversation_id));
      }
    } catch {
      // Silent fail on pin
    } finally {
      setPinningId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="shrink-0 border-b border-border-primary px-6 py-3">
        <h2 className="text-base font-semibold text-text-primary">
          {thread.title}
        </h2>
        {dealCompany && (
          <p className="text-xs text-accent-primary">{dealCompany}</p>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {/* Catch-up banner (shown on re-entry for threads with history) */}
        <ThreadCatchup
          threadId={thread.thread_id}
          messageCount={thread.message_count}
        />

        {/* Follow-ups panel */}
        <ThreadFollowUps
          key={followUpKey}
          threadId={thread.thread_id}
        />

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                {thread.deal_id
                  ? "Paste call notes, emails, or ask for deal coaching."
                  : "Start a conversation with the Strategist."}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Everything in this thread is remembered across sessions.
              </p>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg) => {
          const isPinned = pinnedIds.has(msg.conversation_id);
          const isPinning = pinningId === msg.conversation_id;

          return (
            <div
              key={msg.conversation_id}
              className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-accent-primary/10 text-text-primary"
                    : "bg-surface-tertiary text-text-primary"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div
                    className="prose prose-sm max-w-none text-text-primary
                      prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                      prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                      prose-li:text-text-secondary prose-li:text-sm
                      prose-strong:text-text-primary prose-strong:font-medium
                      prose-ul:my-1 prose-ol:my-1"
                    dangerouslySetInnerHTML={{
                      __html: formatAgentHtml(msg.content),
                    }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-text-muted">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {/* Pin to master memory */}
                  <button
                    onClick={() => handlePin(msg)}
                    disabled={isPinned || isPinning}
                    title={isPinned ? "Saved to master memory" : "Save to master memory"}
                    className={`transition-opacity ${
                      isPinned
                        ? "opacity-100 text-accent-primary"
                        : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-primary"
                    } disabled:cursor-default`}
                  >
                    {isPinning ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 1.5L12.5 5.5L8 10L4.5 10.5L5 7L8.5 1.5Z" />
                        <path d="M2 12.5L5 9.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-primary" />
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-2 rounded-lg bg-status-red/10 p-2 text-xs text-status-red">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border-primary px-6 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Strategist..."
            rows={2}
            maxLength={5000}
            className="flex-1 resize-none rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="self-end rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
