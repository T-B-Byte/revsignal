"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";
import { ThreadCatchup } from "./thread-catchup";
import { ThreadFollowUps } from "./thread-follow-ups";
import type { CoachingMessage, CoachingThread, InteractionType, Deal, Contact } from "@/types/database";
import type { MessageChannel } from "@/lib/agents/email-composer";
import { INTERACTION_TYPES } from "@/types/database";
import { DatePicker } from "@/components/ui/date-picker";

interface ThreadChatProps {
  thread: CoachingThread;
  initialMessages: CoachingMessage[];
  dealCompany?: string | null;
  activeDeals?: Pick<Deal, "deal_id" | "company" | "stage">[];
}

/** Labels for interaction type badges on messages */
const INTERACTION_LABELS: Record<InteractionType, string> = {
  coaching: "Strategist",
  email: "Email",
  conversation: "Conversation",
  call_transcript: "Call Transcript",
  web_meeting: "Web Meeting",
  in_person_meeting: "In-Person",
};

const INTERACTION_COLORS: Record<InteractionType, string> = {
  coaching: "bg-accent-primary/15 text-accent-primary",
  email: "bg-blue-500/15 text-blue-400",
  conversation: "bg-emerald-500/15 text-emerald-400",
  call_transcript: "bg-orange-500/15 text-orange-400",
  web_meeting: "bg-violet-500/15 text-violet-400",
  in_person_meeting: "bg-amber-500/15 text-amber-400",
};

export function ThreadChat({
  thread,
  initialMessages,
  dealCompany,
  activeDeals = [],
}: ThreadChatProps) {
  const [messages, setMessages] = useState<CoachingMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [interactionType, setInteractionType] = useState<InteractionType>("coaching");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpKey, setFollowUpKey] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [composeChannel, setComposeChannel] = useState<MessageChannel>("email");
  const [composeType, setComposeType] = useState<string>("cold_outreach");
  const [composeInstructions, setComposeInstructions] = useState("");
  const [composeSourceContent, setComposeSourceContent] = useState("");
  const [composing, setComposing] = useState(false);
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);
  const [threadContacts, setThreadContacts] = useState<Pick<Contact, "contact_id" | "name" | "company" | "role">[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<Pick<Contact, "contact_id" | "name" | "company" | "role">[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showDealPicker, setShowDealPicker] = useState(false);
  const [linkedDealId, setLinkedDealId] = useState<string | null>(thread.deal_id);
  const [linkingDeal, setLinkingDeal] = useState(false);
  const [taskFromId, setTaskFromId] = useState<string | null>(null);
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskCreatedIds, setTaskCreatedIds] = useState<Set<string>>(new Set());
  // Track exact text snippets turned into tasks, keyed by message ID
  const [taskTexts, setTaskTexts] = useState<
    Record<string, { text: string; dueDate: string }[]>
  >({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    text: string;
    messageId: string;
  } | null>(null);
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
    setLinkedDealId(thread.deal_id);
    setShowDealPicker(false);
    setTaskTexts({});
    setTaskCreatedIds(new Set());
  }, [thread.thread_id, thread.deal_id, initialMessages]);

  // Load persisted task highlights for messages in this thread
  useEffect(() => {
    const controller = new AbortController();
    const messageIds = initialMessages.map((m) => m.conversation_id);
    if (messageIds.length === 0) return;

    fetch(`/api/tasks?source_message_ids=${messageIds.join(",")}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.tasks) return;
        const restored: Record<string, { text: string; dueDate: string }[]> = {};
        for (const task of data.tasks as { source_message_id: string; source_text: string; due_date: string | null }[]) {
          if (!task.source_message_id || !task.source_text) continue;
          if (!restored[task.source_message_id]) restored[task.source_message_id] = [];
          restored[task.source_message_id].push({
            text: task.source_text,
            dueDate: task.due_date ?? "",
          });
        }
        setTaskTexts((prev) => ({ ...prev, ...restored }));
        setTaskCreatedIds((prev) => {
          const next = new Set(prev);
          for (const id of Object.keys(restored)) next.add(id);
          return next;
        });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [thread.thread_id, initialMessages]);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  function handleContextMenu(e: React.MouseEvent, messageId: string) {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) return; // no text selected — use default browser menu

    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      text: selectedText,
      messageId,
    });
  }

  function createTaskFromSelection() {
    if (!contextMenu) return;
    setTaskFromId(contextMenu.messageId);
    setTaskDesc(contextMenu.text);
    setTaskDueDate("");
    setContextMenu(null);
  }

  /** Wrap substrings that were turned into tasks with a highlight mark */
  function highlightTaskText(text: string, messageId: string): React.ReactNode {
    const entries = taskTexts[messageId];
    if (!entries || entries.length === 0) return text;

    const snippetTexts = entries.map((e) => e.text);
    // Build a regex that matches any of the task snippets
    const escaped = snippetTexts.map((s) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const pattern = new RegExp(`(${escaped.join("|")})`, "g");
    const parts = text.split(pattern);

    return parts.map((part, i) => {
      const entry = entries.find((e) => e.text === part);
      if (!entry) return <span key={i}>{part}</span>;

      const dueDateLabel = entry.dueDate
        ? new Date(entry.dueDate + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : null;

      return (
        <mark
          key={i}
          style={{ backgroundColor: "rgba(16, 185, 129, 0.25)" }}
          className="inline-flex items-baseline gap-0.5 rounded px-0.5 text-emerald-300 no-underline"
          title={`Task created${dueDateLabel ? ` · Due ${dueDateLabel}` : ""}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative top-[1px] shrink-0"
          >
            <path d="M9 12l2 2 4-4" />
          </svg>
          {part}
          {dueDateLabel && (
            <span
              style={{ backgroundColor: "rgba(16, 185, 129, 0.3)" }}
              className="ml-1 inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium text-emerald-300 whitespace-nowrap"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {dueDateLabel}
            </span>
          )}
        </mark>
      );
    });
  }

  /** For assistant HTML content, inject highlights via DOM string replacement */
  function highlightTaskHtml(html: string, messageId: string): string {
    const entries = taskTexts[messageId];
    if (!entries || entries.length === 0) return html;

    let result = html;
    for (const entry of entries) {
      const escaped = entry.text.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
      );
      const safeEscaped = escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const dueDateLabel = entry.dueDate
        ? new Date(entry.dueDate + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "";
      const dueBadge = dueDateLabel
        ? `<span style="background-color:rgba(16,185,129,0.3);color:#6ee7b7;border-radius:3px;padding:0 4px;margin-left:3px;font-size:9px;font-weight:500;white-space:nowrap;display:inline-flex;align-items:center;gap:2px"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dueDateLabel}</span>`
        : "";
      const titleAttr = `Task created${dueDateLabel ? ` · Due ${dueDateLabel}` : ""}`;

      result = result.replace(
        new RegExp(`(?<=>)([^<]*?)(${safeEscaped})`, "g"),
        `$1<mark style="background-color:rgba(16,185,129,0.25);color:#6ee7b7;border-radius:3px;padding:0 2px" title="${titleAttr}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline;position:relative;top:1px;flex-shrink:0"><path d="M9 12l2 2 4-4"/></svg>$2${dueBadge}</mark>`
      );
    }
    return result;
  }

  // Get current placeholder from interaction type
  const currentType = INTERACTION_TYPES.find((t) => t.value === interactionType);
  const placeholder = currentType?.placeholder ?? "Type a message...";

  async function handleSend() {
    const trimmed = input.trim();
    const hasImages = pendingImages.length > 0;
    if ((!trimmed && !hasImages) || loading || sendingRef.current) return;
    sendingRef.current = true;

    setError(null);
    setInput("");

    // Capture pending image previews for optimistic display
    const optimisticPreviews = pendingImages.map((img) => img.preview);

    // Optimistic user message
    const userMsg: CoachingMessage = {
      conversation_id: crypto.randomUUID(),
      user_id: "",
      thread_id: thread.thread_id,
      role: "user",
      content: trimmed,
      interaction_type: interactionType,
      context_used: null,
      sources_cited: [],
      tokens_used: null,
      created_at: new Date().toISOString(),
      attachments: optimisticPreviews,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (hasImages) {
        setUploadingImages(true);
        imageUrls = await uploadImages();
        setUploadingImages(false);
      }

      // Build message content — append image markdown if text + images
      const messageContent = imageUrls.length > 0 && trimmed
        ? trimmed + "\n\n" + imageUrls.map((url) => `![attachment](${url})`).join("\n")
        : imageUrls.length > 0
        ? imageUrls.map((url) => `![attachment](${url})`).join("\n")
        : trimmed;

      // If all uploads failed and no text, abort
      if (!messageContent) {
        setError("Image upload failed.");
        setMessages((prev) =>
          prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
        );
        return;
      }

      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageContent,
            interaction_type: interactionType,
            attachments: imageUrls.length > 0 ? imageUrls : undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save.");
        setMessages((prev) =>
          prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
        );
        setInput((prev) => prev || trimmed);
        return;
      }

      const data = await res.json();

      if (interactionType === "coaching") {
        // AI response — add assistant message
        const assistantMsg: CoachingMessage = {
          conversation_id: crypto.randomUUID(),
          user_id: "",
          thread_id: thread.thread_id,
          role: "assistant",
          content: data.response,
          interaction_type: "coaching",
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
      } else if (data.message) {
        // Replace optimistic message with server record (real conversation_id)
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === userMsg.conversation_id
              ? { ...userMsg, ...data.message }
              : m
          )
        );
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
      const firstLine = msg.content.split("\n")[0].replace(/[#*_`]/g, "").trim();
      const title = firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;

      const res = await fetch("/api/strategic-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "strategic_observation",
          title: title || "Pinned from StrategyGPT thread",
          content: msg.content,
          related_deal_id: thread.deal_id || undefined,
          source: `StrategyGPT: ${thread.contact_name || thread.title}`,
          tags: ["pinned", "strategygpt"],
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

  function startEdit(msg: CoachingMessage) {
    setEditingId(msg.conversation_id);
    setEditContent(msg.content);
  }

  async function saveEdit() {
    if (!editingId || !editContent.trim()) return;
    setEditSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: editingId,
            content: editContent,
          }),
        }
      );

      if (res.ok) {
        const updated = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === editingId ? { ...m, content: updated.content } : m
          )
        );
        setEditingId(null);
        setEditContent("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save edit. Please try again.");
      }
    } catch {
      setError("Network error saving edit. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function handleLinkDeal(dealId: string | null) {
    setLinkingDeal(true);
    try {
      const res = await fetch(`/api/coaching/threads/${thread.thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (res.ok) {
        setLinkedDealId(dealId);
        setShowDealPicker(false);
      }
    } catch {
      // Silent fail
    } finally {
      setLinkingDeal(false);
    }
  }

  function startTaskFrom(msg: CoachingMessage) {
    // Extract bullet points / action items from message content
    const lines = msg.content.split("\n");
    const actionLines = lines.filter((l) =>
      /^[-•*]\s/.test(l.trim()) || /^\d+[.)]\s/.test(l.trim())
    );
    const prefill = actionLines.length > 0
      ? actionLines.map((l) => l.trim().replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, "")).join("\n")
      : msg.content.slice(0, 500);

    setTaskFromId(msg.conversation_id);
    setTaskDesc(prefill);
    setTaskDueDate("");
  }

  async function saveTask() {
    if (!taskDesc.trim()) return;
    setTaskSaving(true);

    try {
      // Create one task per line (each bullet becomes its own task)
      const descriptions = taskDesc.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const desc of descriptions) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: desc,
            due_date: taskDueDate || undefined,
            source_message_id: taskFromId || undefined,
            source_text: desc,
          }),
        });
        if (!res.ok) throw new Error("Failed to save task");
      }
      if (taskFromId) {
        setTaskCreatedIds((prev) => new Set(prev).add(taskFromId));
        // Store the text lines + due date that became tasks for highlighting
        const savedDueDate = taskDueDate;
        setTaskTexts((prev) => ({
          ...prev,
          [taskFromId]: [
            ...(prev[taskFromId] ?? []),
            ...descriptions.map((d) => ({ text: d, dueDate: savedDueDate })),
          ],
        }));
      }
      setTaskFromId(null);
      setTaskDesc("");
      setTaskDueDate("");
    } catch {
      // Keep form open on failure
    } finally {
      setTaskSaving(false);
    }
  }

  function cancelTask() {
    setTaskFromId(null);
    setTaskDesc("");
    setTaskDueDate("");
  }

  const EMAIL_TYPES = [
    { value: "cold_outreach", label: "Cold Outreach" },
    { value: "follow_up", label: "Follow-Up" },
    { value: "proposal", label: "Proposal" },
    { value: "check_in", label: "Check-In" },
    { value: "intro_request", label: "Intro Request" },
    { value: "thank_you", label: "Thank You" },
    { value: "meeting_request", label: "Meeting Request" },
  ];

  const LINKEDIN_TYPES = [
    { value: "comment", label: "Comment on Post" },
    { value: "dm", label: "Direct Message" },
    { value: "connection_request", label: "Connection Request" },
    { value: "post_reply", label: "Reply to Comment" },
    { value: "congratulate", label: "Congratulate" },
  ];

  const COMPOSE_TYPES = composeChannel === "email" ? EMAIL_TYPES : LINKEDIN_TYPES;

  // Reset type when switching channels
  function handleChannelChange(channel: MessageChannel) {
    setComposeChannel(channel);
    setComposeType(channel === "email" ? "cold_outreach" : "comment");
    setComposeSourceContent("");
  }

  // Contact search for linking
  async function searchContacts(query: string) {
    setContactSearch(query);
    if (query.length < 2) {
      setContactResults([]);
      return;
    }
    setSearchingContacts(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setContactResults(data.contacts ?? []);
      }
    } catch {
      // ignore search errors
    } finally {
      setSearchingContacts(false);
    }
  }

  function selectContact(contact: Pick<Contact, "contact_id" | "name" | "company" | "role">) {
    setLinkedContactId(contact.contact_id);
    setThreadContacts((prev) =>
      prev.some((c) => c.contact_id === contact.contact_id) ? prev : [...prev, contact]
    );
    setShowContactSearch(false);
    setContactSearch("");
    setContactResults([]);
  }

  async function handleCompose() {
    if (composing) return;
    setComposing(true);
    setError(null);

    try {
      const res = await fetch("/api/agents/compose-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: composeChannel,
          messageType: composeType,
          dealId: linkedDealId || undefined,
          contactId: linkedContactId || undefined,
          instructions: composeInstructions || undefined,
          sourceContent: composeSourceContent || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to draft message.");
        return;
      }

      const data = await res.json();

      // Format the draft as a message — LinkedIn has no subject line
      const typeLabel = COMPOSE_TYPES.find((t) => t.value === data.messageType)?.label ?? data.messageType;
      const channelLabel = composeChannel === "linkedin" ? "LinkedIn" : "Email";
      let draftContent: string;

      if (composeChannel === "linkedin") {
        draftContent = `**Draft: ${channelLabel} · ${typeLabel}**\n\n${data.body}`;
      } else {
        draftContent = `**Draft: ${typeLabel}**\n\n**Subject:** ${data.subject}\n\n${data.body}`;
      }

      const draftMsg: CoachingMessage = {
        conversation_id: crypto.randomUUID(),
        user_id: "",
        thread_id: thread.thread_id,
        role: "assistant",
        content: draftContent,
        interaction_type: "coaching",
        context_used: null,
        sources_cited: [],
        tokens_used: data.tokensUsed,
        created_at: data.generatedAt || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, draftMsg]);

      // Save the draft request to the thread
      const channelPrefix = composeChannel === "linkedin" ? "LinkedIn" : "Email";
      await fetch(`/api/coaching/threads/${thread.thread_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Draft ${channelPrefix} for me: ${composeType}${composeInstructions ? ` — ${composeInstructions}` : ""}`,
          interaction_type: "coaching",
        }),
      });

      setShowCompose(false);
      setComposeInstructions("");
      setComposeSourceContent("");
    } catch {
      setError("Network error drafting message.");
    } finally {
      setComposing(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const preview = URL.createObjectURL(file);
        setPendingImages((prev) => [...prev, { file, preview }]);
      }
    }
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of pendingImages) {
      const form = new FormData();
      form.append("file", img.file);
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/attachments`,
        { method: "POST", body: form }
      );
      if (res.ok) {
        const { url } = await res.json();
        urls.push(url);
      }
      URL.revokeObjectURL(img.preview);
    }
    setPendingImages([]);
    return urls;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (interactionType === "coaching") {
      // Chat mode: Enter sends, Shift+Enter newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else {
      // Intel paste mode: Cmd/Ctrl+Enter saves, plain Enter is newline
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="shrink-0 border-b border-border-primary px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              {thread.contact_name || thread.title}
            </h2>
            {thread.company && (
              <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
                {thread.company}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              showCompose
                ? "bg-accent-primary text-white"
                : "bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/80"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Draft Message
          </button>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {thread.contact_role && (
            <p className="text-xs text-text-secondary">{thread.contact_role}</p>
          )}
          {dealCompany && !thread.company && (
            <p className="text-xs text-accent-primary">{dealCompany}</p>
          )}
          {/* Deal link */}
          {showDealPicker ? (
            <div className="flex items-center gap-1.5">
              <select
                value={linkedDealId ?? ""}
                onChange={(e) => handleLinkDeal(e.target.value || null)}
                disabled={linkingDeal}
                className="rounded border border-border-primary bg-surface-secondary px-2 py-0.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
                autoFocus
              >
                <option value="">No deal</option>
                {activeDeals.map((d) => (
                  <option key={d.deal_id} value={d.deal_id}>
                    {d.company} ({d.stage.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowDealPicker(false)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : linkedDealId ? (
            <button
              onClick={() => setShowDealPicker(true)}
              className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors"
              title="Change linked deal"
            >
              {activeDeals.find((d) => d.deal_id === linkedDealId)?.company ?? "Linked deal"} ·{" "}
              {activeDeals.find((d) => d.deal_id === linkedDealId)?.stage.replace(/_/g, " ") ?? ""}
            </button>
          ) : (
            <button
              onClick={() => setShowDealPicker(true)}
              className="text-[10px] text-text-muted hover:text-accent-primary transition-colors"
            >
              + Link to deal
            </button>
          )}
        </div>
      </div>

      {/* Message compose panel */}
      {showCompose && (
        <div className="shrink-0 border-b border-border-primary bg-surface-secondary/50 px-6 py-3 space-y-3">
          {/* Channel toggle + Type selector */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-md border border-border-primary overflow-hidden">
              <button
                onClick={() => handleChannelChange("email")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  composeChannel === "email"
                    ? "bg-accent-primary text-white"
                    : "bg-surface-primary text-text-secondary hover:text-text-primary"
                }`}
              >
                Email
              </button>
              <button
                onClick={() => handleChannelChange("linkedin")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-border-primary ${
                  composeChannel === "linkedin"
                    ? "bg-blue-600 text-white"
                    : "bg-surface-primary text-text-secondary hover:text-text-primary"
                }`}
              >
                LinkedIn
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Type</label>
              <select
                value={composeType}
                onChange={(e) => setComposeType(e.target.value)}
                className="rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
              >
                {COMPOSE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Context row: deal + contact links */}
          <div className="flex items-center gap-3 flex-wrap">
            {!linkedDealId && !linkedContactId && (
              <p className="text-[10px] text-text-muted">
                Link a deal or contact for better context
              </p>
            )}
            {/* Contact link */}
            {linkedContactId ? (
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {threadContacts.find((c) => c.contact_id === linkedContactId)?.name ?? "Contact"}
                  {threadContacts.find((c) => c.contact_id === linkedContactId)?.role
                    ? ` · ${threadContacts.find((c) => c.contact_id === linkedContactId)!.role}`
                    : ""}
                </span>
                <button
                  onClick={() => setLinkedContactId(null)}
                  className="text-[10px] text-text-muted hover:text-red-400 transition-colors"
                  title="Remove contact"
                >
                  x
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowContactSearch(!showContactSearch)}
                  className="text-[10px] text-text-muted hover:text-emerald-400 transition-colors"
                >
                  + Link contact
                </button>
                {showContactSearch && (
                  <div className="absolute top-6 left-0 z-20 w-64 rounded-md border border-border-primary bg-surface-primary shadow-lg">
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => searchContacts(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full rounded-t-md border-b border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {searchingContacts && (
                        <p className="px-3 py-2 text-[10px] text-text-muted">Searching...</p>
                      )}
                      {contactResults.map((c) => (
                        <button
                          key={c.contact_id}
                          onClick={() => selectContact(c)}
                          className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-tertiary transition-colors"
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.role && <span className="text-text-muted"> · {c.role}</span>}
                          <span className="text-text-muted"> · {c.company}</span>
                        </button>
                      ))}
                      {!searchingContacts && contactSearch.length >= 2 && contactResults.length === 0 && (
                        <p className="px-3 py-2 text-[10px] text-text-muted">No contacts found</p>
                      )}
                      {contactSearch.length < 2 && (
                        <p className="px-3 py-2 text-[10px] text-text-muted">Type 2+ characters to search</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Source content — for responding to posts/emails */}
          {composeChannel === "linkedin" && (
            <textarea
              value={composeSourceContent}
              onChange={(e) => setComposeSourceContent(e.target.value)}
              placeholder="Paste the LinkedIn post or comment you're responding to..."
              rows={3}
              className="w-full resize-none rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          )}

          {/* Instructions */}
          <textarea
            value={composeInstructions}
            onChange={(e) => setComposeInstructions(e.target.value)}
            placeholder={
              composeChannel === "linkedin"
                ? "Instructions — e.g., 'Highlight our intent data angle' or 'Keep it warm, we met at the conference'"
                : "Instructions — e.g., 'Introduce DaaS offering, mention their intent data use case' or 'Follow up on last week's call about pricing'"
            }
            rows={2}
            className="w-full resize-none rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowCompose(false); setComposeInstructions(""); setComposeSourceContent(""); }}
              className="rounded px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompose}
              disabled={composing}
              className={`rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50 transition-colors ${
                composeChannel === "linkedin"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-accent-primary hover:bg-accent-primary/90"
              }`}
            >
              {composing
                ? "Drafting..."
                : composeChannel === "linkedin"
                  ? "Draft LinkedIn Message"
                  : "Draft Email"}
            </button>
          </div>
        </div>
      )}

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
                {thread.contact_name
                  ? `Add intel about ${thread.contact_name} or ask the Strategist for coaching.`
                  : "Start a conversation with the Strategist."}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Select the type of correspondence below before pasting.
              </p>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg) => {
          const isPinned = pinnedIds.has(msg.conversation_id);
          const isPinning = pinningId === msg.conversation_id;
          const msgType = msg.interaction_type || "coaching";

          const isEditing = editingId === msg.conversation_id;

          return (
            <div
              key={msg.conversation_id}
              className={`group flex ${isEditing ? "justify-stretch" : msg.role === "user" ? "justify-end" : "justify-start"}`}
              onContextMenu={(e) => handleContextMenu(e, msg.conversation_id)}
            >
              <div
                className={`relative rounded-lg px-4 py-3 ${
                  isEditing
                    ? "w-full bg-surface-tertiary text-text-primary"
                    : msg.role === "user"
                    ? "max-w-[80%] bg-accent-primary/10 text-text-primary"
                    : "max-w-[80%] bg-surface-tertiary text-text-primary"
                }`}
              >
                {/* Interaction type badge for user messages */}
                {msg.role === "user" && msgType !== "coaching" && (
                  <span
                    className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${INTERACTION_COLORS[msgType]}`}
                  >
                    {INTERACTION_LABELS[msgType]}
                  </span>
                )}

                {isEditing ? (
                  /* Inline edit mode — full width, resizable */
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEdit();
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          saveEdit();
                        }
                      }}
                      rows={Math.max(Math.min(editContent.split("\n").length + 2, 20), 6)}
                      autoFocus
                      className="w-full resize-y rounded border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none min-h-[120px]"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={saveEdit}
                        disabled={editSaving || !editContent.trim()}
                        className="rounded bg-accent-primary px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                      >
                        {editSaving ? "Saving..." : "Save ⌘↵"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : msg.role === "assistant" ? (
                  <div
                    className="prose prose-sm max-w-none text-text-primary
                      prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                      prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                      prose-li:text-text-secondary prose-li:text-sm
                      prose-strong:text-text-primary prose-strong:font-medium
                      prose-ul:my-1 prose-ol:my-1"
                    dangerouslySetInnerHTML={{
                      __html: highlightTaskHtml(formatAgentHtml(msg.content), msg.conversation_id),
                    }}
                  />
                ) : (
                  <div>
                    {msg.content && !msg.content.match(/^!\[attachment\]/) && (
                      <p className="text-sm whitespace-pre-wrap">
                        {highlightTaskText(
                          msg.content.replace(/\n\n!\[attachment\]\([^)]+\)/g, ""),
                          msg.conversation_id
                        )}
                      </p>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt="attachment"
                              className="max-h-48 max-w-xs rounded-md border border-border-primary object-contain"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Inline task creation form */}
                {taskFromId === msg.conversation_id && (
                  <div className="mt-2 rounded-md border border-accent-primary/30 bg-surface-secondary p-3 space-y-2">
                    <p className="text-[10px] font-medium text-accent-primary uppercase tracking-wide">Create Tasks</p>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelTask();
                      }}
                      rows={Math.min(taskDesc.split("\n").length + 1, 8)}
                      autoFocus
                      placeholder="One task per line..."
                      className="w-full resize-none rounded border border-border-primary bg-surface-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-text-secondary">Due:</label>
                      <DatePicker
                        value={taskDueDate}
                        onChange={(v) => setTaskDueDate(v)}
                        min={new Date().toISOString().split("T")[0]}
                        size="sm"
                        placeholder="Pick date"
                      />
                      <div className="ml-auto flex gap-1.5">
                        <button
                          onClick={cancelTask}
                          className="rounded bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveTask}
                          disabled={taskSaving || !taskDesc.trim()}
                          className="rounded bg-accent-primary px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                        >
                          {taskSaving ? "Saving..." : `Create ${taskDesc.split("\n").filter((l) => l.trim()).length} task${taskDesc.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-text-muted">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {/* Create task from message */}
                    {editingId !== msg.conversation_id && taskFromId !== msg.conversation_id && (
                      <button
                        onClick={() => startTaskFrom(msg)}
                        title={taskCreatedIds.has(msg.conversation_id) ? "Task created" : "Create task"}
                        className={`transition-opacity ${
                          taskCreatedIds.has(msg.conversation_id)
                            ? "opacity-100 text-emerald-400"
                            : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-primary"
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      </button>
                    )}
                    {/* Edit button (user messages only) */}
                    {msg.role === "user" && editingId !== msg.conversation_id && (
                      <button
                        onClick={() => startEdit(msg)}
                        title="Edit"
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-primary transition-opacity"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
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
            </div>
          );
        })}

        {/* Right-click context menu for creating tasks from selected text */}
        {contextMenu && (
          <div
            className="fixed z-50 rounded-lg border border-border-primary bg-surface-secondary shadow-lg py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={createTaskFromSelection}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Create Task
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && interactionType === "coaching" && (
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
        {/* Interaction type selector */}
        <div className="mb-2 flex flex-wrap gap-1">
          {INTERACTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setInteractionType(type.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                interactionType === type.value
                  ? "bg-accent-primary text-white"
                  : "bg-surface-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Pending image previews */}
        {pendingImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group/img">
                <img
                  src={img.preview}
                  alt="pending"
                  className="h-16 w-16 rounded-md border border-border-primary object-cover"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-red text-[10px] text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={pendingImages.length > 0 ? "Add a caption (optional)..." : placeholder}
            rows={interactionType === "coaching" ? 2 : 4}
            maxLength={interactionType === "coaching" ? 5000 : 50000}
            className="flex-1 resize-none rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && pendingImages.length === 0)}
            title={interactionType === "coaching" ? "Enter to send" : "⌘+Enter to save"}
            className="self-end rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {uploadingImages ? "Uploading..." : interactionType === "coaching" ? "Send" : "Save ⌘↵"}
          </button>
        </div>
      </div>
    </div>
  );
}
