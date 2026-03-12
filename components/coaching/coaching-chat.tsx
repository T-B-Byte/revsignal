"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type { CoachingMessage, Deal, Stakeholder } from "@/types/database";

interface CoachingChatProps {
  hasAiAccess: boolean;
  initialHistory: CoachingMessage[];
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
  stakeholders: Pick<
    Stakeholder,
    "stakeholder_id" | "name" | "role" | "organization"
  >[];
}

export function CoachingChat({
  hasAiAccess,
  initialHistory,
  activeDeals,
  stakeholders,
}: CoachingChatProps) {
  const [messages, setMessages] = useState<CoachingMessage[]>(initialHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");

    // Add user message optimistically
    const userMsg: CoachingMessage = {
      conversation_id: crypto.randomUUID(),
      user_id: "",
      thread_id: null,
      role: "user",
      content: trimmed,
      interaction_type: "coaching",
      context_used: null,
      sources_cited: [],
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Detect if a stakeholder name is mentioned
      const mentionedStakeholder = stakeholders.find((s) =>
        trimmed.toLowerCase().includes(s.name.toLowerCase())
      );

      const res = await fetch("/api/agents/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          dealId: selectedDealId || undefined,
          stakeholderName: mentionedStakeholder?.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to get response.");
        // Roll back optimistic user message and restore input
        setMessages((prev) =>
          prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
        );
        setInput(trimmed);
        return;
      }

      const data = await res.json();

      const assistantMsg: CoachingMessage = {
        conversation_id: crypto.randomUUID(),
        user_id: "",
        thread_id: null,
        role: "assistant",
        content: data.response,
        interaction_type: "coaching",
        context_used: null,
        sources_cited: [],
        tokens_used: data.tokensUsed,
        created_at: data.generatedAt,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError("Network error. Please try again.");
      // Roll back optimistic user message and restore input
      setMessages((prev) =>
        prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
      );
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!hasAiAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>The Strategist: Coaching Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              Coaching is available on the Power plan.
            </p>
            <a
              href="/settings"
              className="mt-2 inline-block text-sm font-medium text-accent-primary hover:underline"
            >
              Upgrade your plan
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" style={{ height: "calc(100vh - 12rem)" }}>
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <CardTitle>Coaching Mode</CardTitle>
        {activeDeals.length > 0 && (
          <select
            value={selectedDealId}
            onChange={(e) => setSelectedDealId(e.target.value)}
            aria-label="Select deal context"
            className="rounded-md border border-border-primary bg-surface-secondary px-2 py-1 text-xs text-text-secondary"
          >
            <option value="">No deal context</option>
            {activeDeals.map((d) => (
              <option key={d.deal_id} value={d.deal_id}>
                {d.company} ({d.stage})
              </option>
            ))}
          </select>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        {/* Message history */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Ask me anything: meeting prep, stakeholder strategy, deal
                  tactics, or role advice.
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  I have context on your pipeline, stakeholders, and strategic
                  notes.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.conversation_id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
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
                <p className="mt-1 text-[10px] text-text-muted">
                  {new Date(msg.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

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
      </CardContent>
    </Card>
  );
}
