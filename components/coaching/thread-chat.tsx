"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatAgentHtml, stripFollowUps, extractMeetingDetected } from "@/lib/format-agent-html";
import { ThreadCatchup } from "./thread-catchup";
import { ThreadFollowUps } from "./thread-follow-ups";
import type { CoachingMessage, CoachingThread, CoachingThreadWithDeal, InteractionType, Deal, Contact, Project, MaEntity, MessageReaction } from "@/types/database";
import { ThreadBreadcrumb } from "./thread-breadcrumb";
import type { MessageChannel } from "@/lib/agents/email-composer";
import { MESSAGE_REACTIONS } from "@/types/database";
import { DatePicker } from "@/components/ui/date-picker";

interface ThreadChatProps {
  thread: CoachingThreadWithDeal;
  initialMessages: CoachingMessage[];
  dealCompany?: string | null;
  activeDeals?: Pick<Deal, "deal_id" | "company" | "stage">[];
  /** Pre-fills the input on first load (e.g. studio project kickoff message) */
  primeMessage?: string;
  /** Pre-generated "where we left off" catchup — shown immediately without a network fetch. */
  initialCatchup?: string | null;
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
  primeMessage,
  initialCatchup,
}: ThreadChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<CoachingMessage[]>(initialMessages);
  const [input, setInput] = useState(initialMessages.length === 0 && primeMessage ? primeMessage : "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpKey, setFollowUpKey] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [pendingDocs, setPendingDocs] = useState<{ file: File; name: string }[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);
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
  // Unified entity linking state
  const [linkedDealId, setLinkedDealId] = useState<string | null>(thread.deal_id);
  const [linkedDeal, setLinkedDeal] = useState<Pick<Deal, "deal_id" | "company" | "stage"> | null>(thread.deals ?? null);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(thread.project_id);
  const [linkedProject, setLinkedProject] = useState<Pick<Project, "project_id" | "name" | "status" | "category"> | null>(thread.projects ?? null);
  const [linkedContactId2, setLinkedContactId2] = useState<string | null>(thread.contact_id);
  const [linkedContact, setLinkedContact] = useState<Pick<Contact, "contact_id" | "name" | "company" | "role"> | null>(thread.contacts ?? null);
  const [linkedProspectId, setLinkedProspectId] = useState<string | null>(thread.prospect_id);
  const [linkedProspectName, setLinkedProspectName] = useState<string | null>(null);
  const [linkedMaEntityId, setLinkedMaEntityId] = useState<string | null>(thread.ma_entity_id);
  const [linkedMaEntity, setLinkedMaEntity] = useState<Pick<MaEntity, "entity_id" | "company" | "entity_type" | "stage"> | null>(thread.ma_entities ?? null);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityResults, setEntityResults] = useState<{ id: string; type: string; title: string; subtitle?: string }[]>([]);
  const [searchingEntities, setSearchingEntities] = useState(false);
  const [linkingEntity, setLinkingEntity] = useState(false);
  const [taskFromId, setTaskFromId] = useState<string | null>(null);
  const [taskDesc, setTaskDesc] = useState("");
  const [taskSourceText, setTaskSourceText] = useState("");  // original selected text for highlighting
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSavedFlash, setTaskSavedFlash] = useState<string | null>(null);
  const [taskCreatedIds, setTaskCreatedIds] = useState<Set<string>>(new Set());
  // Track exact text snippets turned into tasks, keyed by message ID
  const [taskTexts, setTaskTexts] = useState<
    Record<string, { text: string; dueDate: string }[]>
  >({});
  const [moreToAdd, setMoreToAdd] = useState(false);
  const [inputChunks, setInputChunks] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    text: string;
    messageId: string;
    showContactPicker?: boolean;
  } | null>(null);
  const [agendaContactSearch, setAgendaContactSearch] = useState("");
  const [agendaContactResults, setAgendaContactResults] = useState<Pick<Contact, "contact_id" | "name" | "company" | "role">[]>([]);
  const [agendaSearching, setAgendaSearching] = useState(false);
  const [agendaSaving, setAgendaSaving] = useState(false);
  const [meetingPrompt, setMeetingPrompt] = useState<{
    title: string;
    attendees: { name: string; role?: string }[];
    suggested_agenda?: string[];
  } | null>(null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset state and load persisted task highlights when thread changes.
  // Combined into one effect to avoid a race where the reset clears
  // highlights before the async fetch can restore them.
  useEffect(() => {
    setMessages(initialMessages);
    setError(null);
    setInput("");
    setLinkedDealId(thread.deal_id);
    setLinkedDeal(thread.deals ?? null);
    setLinkedProjectId(thread.project_id);
    setLinkedProject(thread.projects ?? null);
    setLinkedContactId2(thread.contact_id);
    setLinkedContact(thread.contacts ?? null);
    setLinkedProspectId(thread.prospect_id);
    setLinkedMaEntityId(thread.ma_entity_id);
    setLinkedMaEntity(thread.ma_entities ?? null);
    setShowEntityPicker(false);
    setEntitySearch("");
    setEntityResults([]);

    const controller = new AbortController();
    const messageIds = initialMessages.map((m) => m.conversation_id);

    if (messageIds.length === 0) {
      setTaskTexts({});
      setTaskCreatedIds(new Set());
      return;
    }

    // Fetch persisted task highlights, then set state atomically
    fetch(`/api/tasks?source_message_ids=${messageIds.join(",")}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const restored: Record<string, { text: string; dueDate: string }[]> = {};
        if (data.tasks) {
          for (const task of data.tasks as { source_message_id: string; source_text: string; due_date: string | null }[]) {
            if (!task.source_message_id || !task.source_text) continue;
            if (!restored[task.source_message_id]) restored[task.source_message_id] = [];
            restored[task.source_message_id].push({
              text: task.source_text,
              dueDate: task.due_date ?? "",
            });
          }
        }
        // Set restored highlights (replaces previous thread's highlights)
        setTaskTexts(restored);
        setTaskCreatedIds(new Set(Object.keys(restored)));
      })
      .catch(() => {
        // On failure, clear stale highlights from previous thread
        setTaskTexts({});
        setTaskCreatedIds(new Set());
      });

    return () => controller.abort();
  }, [thread.thread_id, thread.deal_id, initialMessages]);

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
    setTaskSourceText(contextMenu.text);  // preserve original for highlight matching
    setTaskDueDate("");
    setContextMenu(null);
  }

  function showAgendaContactPicker() {
    if (!contextMenu) return;
    setContextMenu({ ...contextMenu, showContactPicker: true });
    setAgendaContactSearch("");
    setAgendaContactResults([]);
    // Pre-populate with thread contacts if available
    if (threadContacts.length > 0) {
      setAgendaContactResults(threadContacts);
    }
  }

  async function searchAgendaContacts(query: string) {
    setAgendaContactSearch(query);
    if (query.length < 2) {
      setAgendaContactResults(threadContacts.length > 0 ? threadContacts : []);
      return;
    }
    setAgendaSearching(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAgendaContactResults(data.contacts ?? []);
      }
    } catch {
      // fall back to thread contacts
    } finally {
      setAgendaSearching(false);
    }
  }

  async function addToContactAgenda(contactId: string) {
    if (!contextMenu || agendaSaving) return;
    setAgendaSaving(true);
    try {
      const res = await fetch("/api/contact-agenda-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          description: contextMenu.text,
          source: "manual",
        }),
      });
      if (!res.ok) {
        setError("Failed to add agenda item.");
      }
    } catch {
      setError("Failed to add agenda item.");
    } finally {
      setAgendaSaving(false);
      setContextMenu(null);
    }
  }

  function askStrategistFromSelection() {
    if (!contextMenu) return;
    const selectedText = contextMenu.text;
    setContextMenu(null);
    // Prefill input with the selected text as a quote
    setInput(`Re: "${selectedText.length > 300 ? selectedText.slice(0, 300) + "..." : selectedText}"\n\n`);
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at end
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
        autoResizeTextarea(textareaRef.current);
      }
    }, 0);
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

  const placeholder = "Ask the Strategist anything...";

  async function handleSend(options?: { flushQueue?: boolean }) {
    const trimmed = input.trim();
    const hasImages = pendingImages.length > 0;
    const hasDocs = pendingDocs.length > 0;
    if ((!trimmed && !hasImages && !hasDocs && inputChunks.length === 0) || loading || sendingRef.current) return;

    // If "more to paste" is on (and not flushing), buffer the chunk and wait
    if (moreToAdd && !options?.flushQueue) {
      if (trimmed) {
        setInputChunks((prev) => [...prev, trimmed]);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      return;
    }

    sendingRef.current = true;

    setError(null);
    // Combine any buffered chunks with the current input
    const combined = [...inputChunks, trimmed].filter(Boolean).join("\n\n");
    // Keep a snapshot so we can restore on failure
    const chunksSnapshot = [...inputChunks];
    setInputChunks([]);
    setInput("");
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Capture pending image previews for optimistic display
    const optimisticPreviews = pendingImages.map((img) => img.preview);

    // Optimistic user message
    const userMsg: CoachingMessage = {
      conversation_id: crypto.randomUUID(),
      user_id: "",
      thread_id: thread.thread_id,
      role: "user",
      content: combined,
      interaction_type: "coaching",
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

      // Upload documents and extract text
      let docUrls: string[] = [];
      let docTexts: string[] = [];
      if (hasDocs) {
        setUploadingImages(true);
        const docResults = await uploadDocs();
        docUrls = docResults.map((d) => d.url).filter(Boolean);
        docTexts = docResults.map((d) => d.text).filter(Boolean);
        setUploadingImages(false);
      }

      const allAttachmentUrls = [...imageUrls, ...docUrls];

      // Build message content
      let messageContent = combined;

      // Append document text so the Strategist can read it
      if (docTexts.length > 0) {
        const docSections = pendingDocs.map((doc, i) => {
          const text = docTexts[i];
          if (!text) return null;
          return `\n\n---\n📄 **${doc.name}**\n\n${text}`;
        }).filter(Boolean).join("");
        messageContent = (messageContent || "") + docSections;
      }

      // Append image markdown
      if (imageUrls.length > 0) {
        const imgMarkdown = imageUrls.map((url) => `![attachment](${url})`).join("\n");
        messageContent = messageContent
          ? messageContent + "\n\n" + imgMarkdown
          : imgMarkdown;
      }

      // Append doc download links
      if (docUrls.length > 0) {
        const docLinks = pendingDocs.map((doc, i) => {
          const url = docUrls[i];
          return url ? `[📄 ${doc.name}](${url})` : null;
        }).filter(Boolean).join("\n");
        messageContent = messageContent
          ? messageContent + "\n\n" + docLinks
          : docLinks;
      }

      // If all uploads failed and no text, abort
      if (!messageContent) {
        setError("Upload failed.");
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
            interaction_type: "coaching",
            attachments: allAttachmentUrls.length > 0 ? allAttachmentUrls : undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save.");
        setMessages((prev) =>
          prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
        );
        // Restore queued chunks so the user doesn't lose pasted content
        if (chunksSnapshot.length > 0) {
          setInputChunks(chunksSnapshot);
          setMoreToAdd(true);
        }
        setInput((prev) => prev || trimmed);
        return;
      }

      const data = await res.json();

      // Replace optimistic user message with real conversation_id from server
      if (data.userConversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === userMsg.conversation_id
              ? { ...m, conversation_id: data.userConversationId }
              : m
          )
        );
      }

      // AI response — add assistant message with real conversation_id
      const assistantMsg: CoachingMessage = {
        conversation_id: data.assistantConversationId || crypto.randomUUID(),
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

      // If a meeting was detected, show the create-meeting prompt
      if (data.meetingDetected) {
        setMeetingPrompt(data.meetingDetected);
      }
      // Cross-post @mentions to other threads (fire-and-forget)
      const mentions = extractMentions(trimmed);
      if (mentions.length > 0) {
        const sourceThreadName = thread.contact_name || thread.title;
        // Strip @mentions from the content for the cross-post
        const cleanContent = trimmed.replace(/@(\w+(?:\s+\w+)?)/g, "$1");
        fetch("/api/coaching/threads/cross-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: cleanContent,
            source_thread_name: sourceThreadName,
            mentions,
          }),
        }).catch(() => {
          // Silent fail — cross-post is best-effort
        });
      }
    } catch {
      setError("Network error. Please try again.");
      setMessages((prev) =>
        prev.filter((m) => m.conversation_id !== userMsg.conversation_id)
      );
      // Restore queued chunks so the user doesn't lose pasted content
      if (chunksSnapshot.length > 0) {
        setInputChunks(chunksSnapshot);
        setMoreToAdd(true);
      }
      setInput((prev) => prev || trimmed);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  /** Auto-resize textarea to fit content */
  function autoResizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.5) + "px";
  }

  /** Extract @mentions from message text. Returns array of names. */
  function extractMentions(text: string): string[] {
    // Match @Name or @FirstName LastName patterns
    const regex = /@(\w+(?:\s+\w+)?)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return [...new Set(mentions)];
  }

  async function handlePin(msg: CoachingMessage) {
    if (pinnedIds.has(msg.conversation_id) || pinningId) return;
    setPinningId(msg.conversation_id);

    try {
      const cleanContent = stripFollowUps(msg.content);
      const firstLine = cleanContent.split("\n")[0].replace(/[#*_`]/g, "").trim();
      const title = firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;

      const res = await fetch("/api/strategic-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "strategic_observation",
          title: title || "Pinned from StrategyGPT thread",
          content: cleanContent,
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

  async function handleReaction(msgId: string, reaction: MessageReaction | null) {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.conversation_id === msgId ? { ...m, reaction } : m
      )
    );

    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages/react`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: msgId, reaction }),
        }
      );

      if (!res.ok) {
        // Revert on failure
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === msgId ? { ...m, reaction: null } : m
          )
        );
      }
    } catch {
      // Revert on error
      setMessages((prev) =>
        prev.map((m) =>
          m.conversation_id === msgId ? { ...m, reaction: null } : m
        )
      );
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

  async function handleDelete(msg: CoachingMessage) {
    if (deletingId) return;
    setDeletingId(msg.conversation_id);
    setError(null);

    // If deleting a user message, also delete the AI response that follows it
    const deletePair = msg.role === "user";

    // Find IDs to remove optimistically
    const idsToRemove = new Set([msg.conversation_id]);
    if (deletePair) {
      const idx = messages.findIndex((m) => m.conversation_id === msg.conversation_id);
      if (idx >= 0 && idx + 1 < messages.length && messages[idx + 1].role === "assistant") {
        idsToRemove.add(messages[idx + 1].conversation_id);
      }
    }

    // Optimistic removal
    const previousMessages = messages;
    setMessages((prev) => prev.filter((m) => !idsToRemove.has(m.conversation_id)));

    try {
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/messages`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: msg.conversation_id,
            delete_pair: deletePair,
          }),
        }
      );

      if (!res.ok) {
        // Revert on failure
        setMessages(previousMessages);
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete message.");
      }
    } catch {
      setMessages(previousMessages);
      setError("Network error deleting message.");
    } finally {
      setDeletingId(null);
    }
  }

  // Unified entity search
  async function searchEntities(query: string) {
    setEntitySearch(query);
    if (query.length < 2) {
      setEntityResults([]);
      return;
    }
    setSearchingEntities(true);
    try {
      const res = await fetch(`/api/coaching/threads/topic-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setEntityResults(data.topics ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSearchingEntities(false);
    }
  }

  // Link a single entity (additive, does NOT clear others)
  async function handleLinkEntity(entity: { id: string; type: string; title: string; subtitle?: string }) {
    setLinkingEntity(true);
    const fkMap: Record<string, string> = {
      deal: "deal_id",
      prospect: "prospect_id",
      project: "project_id",
      ma_entity: "ma_entity_id",
      contact: "contact_id",
    };
    const fk = fkMap[entity.type];
    if (!fk) {
      setLinkingEntity(false);
      return;
    }

    try {
      const res = await fetch(`/api/coaching/threads/${thread.thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fk]: entity.id }),
      });
      if (res.ok) {
        // Update local state for the specific entity type
        if (entity.type === "deal") {
          setLinkedDealId(entity.id);
          const deal = activeDeals.find((d) => d.deal_id === entity.id);
          setLinkedDeal(deal ?? { deal_id: entity.id, company: entity.title, stage: entity.subtitle?.replace(/ /g, "_") as Deal["stage"] ?? "lead" });
        } else if (entity.type === "project") {
          setLinkedProjectId(entity.id);
          setLinkedProject({ project_id: entity.id, name: entity.title, status: "active", category: entity.subtitle ?? null });
        } else if (entity.type === "contact") {
          setLinkedContactId2(entity.id);
          const parts = entity.subtitle?.split(" · ") ?? [];
          setLinkedContact({ contact_id: entity.id, name: entity.title, company: parts[1] ?? "", role: parts[0] ?? "" });
        } else if (entity.type === "prospect") {
          setLinkedProspectId(entity.id);
          setLinkedProspectName(entity.title);
        } else if (entity.type === "ma_entity") {
          setLinkedMaEntityId(entity.id);
          setLinkedMaEntity({ entity_id: entity.id, company: entity.title, entity_type: "target", stage: "identified" });
        }
        setShowEntityPicker(false);
        setEntitySearch("");
        setEntityResults([]);
      }
    } catch {
      // silent fail
    } finally {
      setLinkingEntity(false);
    }
  }

  // Unlink a specific entity type
  async function handleUnlinkEntity(type: string, _id: string) {
    setLinkingEntity(true);
    const fkMap: Record<string, string> = {
      deal: "deal_id",
      prospect: "prospect_id",
      project: "project_id",
      ma_entity: "ma_entity_id",
      contact: "contact_id",
    };
    const fk = fkMap[type];
    if (!fk) {
      setLinkingEntity(false);
      return;
    }

    try {
      const res = await fetch(`/api/coaching/threads/${thread.thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fk]: null }),
      });
      if (res.ok) {
        if (type === "deal") { setLinkedDealId(null); setLinkedDeal(null); }
        else if (type === "project") { setLinkedProjectId(null); setLinkedProject(null); }
        else if (type === "contact") { setLinkedContactId2(null); setLinkedContact(null); }
        else if (type === "prospect") { setLinkedProspectId(null); setLinkedProspectName(null); }
        else if (type === "ma_entity") { setLinkedMaEntityId(null); setLinkedMaEntity(null); }
      }
    } catch {
      // silent fail
    } finally {
      setLinkingEntity(false);
    }
  }

  function startTaskFrom(msg: CoachingMessage) {
    // Extract bullet points / action items from message content
    const lines = stripFollowUps(msg.content).split("\n");
    const actionLines = lines.filter((l) =>
      /^[-•*]\s/.test(l.trim()) || /^\d+[.)]\s/.test(l.trim())
    );
    const prefill = actionLines.length > 0
      ? actionLines.map((l) => l.trim().replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, "")).join("\n")
      : stripFollowUps(msg.content).slice(0, 500);

    setTaskFromId(msg.conversation_id);
    setTaskDesc(prefill);
    setTaskSourceText("");  // no specific selection — created from full message
    setTaskDueDate("");
  }

  async function saveTask() {
    if (!taskDesc.trim()) return;
    setTaskSaving(true);
    setTaskError(null);

    try {
      // Create one task per line (each bullet becomes its own task)
      const descriptions = taskDesc.split("\n").map((l) => l.trim()).filter(Boolean);
      // Use original selected text for highlight matching (if created from selection),
      // otherwise fall back to the task description for highlighting
      const highlightText = taskSourceText || null;
      for (const desc of descriptions) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: desc,
            due_date: taskDueDate || undefined,
            source_message_id: taskFromId || undefined,
            source_text: highlightText ?? desc,
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error ?? `Failed to save task (${res.status})`);
        }
      }
      const savedMsgId = taskFromId;
      if (savedMsgId) {
        setTaskCreatedIds((prev) => new Set(prev).add(savedMsgId));
        // Store highlight text for immediate rendering
        const savedDueDate = taskDueDate;
        const textForHighlight = highlightText
          ? [{ text: highlightText, dueDate: savedDueDate }]
          : descriptions.map((d) => ({ text: d, dueDate: savedDueDate }));
        setTaskTexts((prev) => ({
          ...prev,
          [savedMsgId]: [
            ...(prev[savedMsgId] ?? []),
            ...textForHighlight,
          ],
        }));
      }
      // Show brief "Saved" confirmation, then close
      setTaskSavedFlash(savedMsgId);
      setTaskFromId(null);
      setTaskDesc("");
      setTaskSourceText("");
      setTaskDueDate("");
      setTimeout(() => setTaskSavedFlash(null), 2000);
    } catch (err) {
      console.error("Task save failed:", err);
      setTaskError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setTaskSaving(false);
    }
  }

  function cancelTask() {
    setTaskFromId(null);
    setTaskDesc("");
    setTaskSourceText("");
    setTaskDueDate("");
    setTaskError(null);
  }

  async function handleCreateMeeting() {
    if (!meetingPrompt || creatingMeeting) return;
    setCreatingMeeting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingPrompt.title,
          meeting_date: new Date().toISOString(), // placeholder — user can edit in meetings view
          attendees: meetingPrompt.attendees,
          agenda: (meetingPrompt.suggested_agenda ?? []).map((text) => ({ text, covered: false })),
          deal_id: linkedDealId || undefined,
          status: "upcoming",
          content: "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingPrompt(null);
        // Open the new meeting in a new tab so user stays in context
        window.open(`/meetings/${data.meeting.note_id}`, "_blank");
      } else {
        setError("Failed to create meeting. Try again.");
      }
    } catch {
      setError("Failed to create meeting. Try again.");
    } finally {
      setCreatingMeeting(false);
    }
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

    // Check for direct image items first (screenshots, single image copies)
    let hasDirectImages = false;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        hasDirectImages = true;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const preview = URL.createObjectURL(file);
        setPendingImages((prev) => [...prev, { file, preview }]);
      }
    }

    // If no direct images, check for HTML content with embedded <img> tags
    // (e.g. pasting meeting notes from a browser with inline screenshots)
    if (!hasDirectImages) {
      const htmlItem = Array.from(items).find(
        (item) => item.type === "text/html"
      );
      if (htmlItem) {
        htmlItem.getAsString((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const imgs = doc.querySelectorAll("img");
          if (imgs.length === 0) return;

          // Extract image URLs from the pasted HTML
          const srcs: string[] = [];
          imgs.forEach((img) => {
            const src = img.getAttribute("src");
            if (src && (src.startsWith("http") || src.startsWith("data:"))) {
              srcs.push(src);
            }
          });
          if (srcs.length === 0) return;

          // Fetch each image and add to pending
          srcs.forEach(async (src) => {
            try {
              let blob: Blob;
              if (src.startsWith("data:")) {
                // Handle data: URIs directly
                const res = await fetch(src);
                blob = await res.blob();
              } else {
                // Fetch external image — may fail due to CORS
                const res = await fetch(src, { mode: "cors" });
                if (!res.ok) return;
                blob = await res.blob();
              }
              if (!blob.type.startsWith("image/")) return;
              const ext = blob.type.split("/")[1] || "png";
              const file = new File([blob], `pasted-image.${ext}`, {
                type: blob.type,
              });
              const preview = URL.createObjectURL(file);
              setPendingImages((prev) => [...prev, { file, preview }]);
            } catch {
              // CORS or network error — skip this image silently
            }
          });
        });
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

  async function uploadDocs(): Promise<{ url: string; text: string }[]> {
    const results: { url: string; text: string }[] = [];
    for (const doc of pendingDocs) {
      const form = new FormData();
      form.append("file", doc.file);
      const res = await fetch(
        `/api/coaching/threads/${thread.thread_id}/attachments`,
        { method: "POST", body: form }
      );
      if (res.ok) {
        const data = await res.json();
        results.push({ url: data.url || "", text: data.extracted_text || "" });
      } else {
        results.push({ url: "", text: "" });
      }
    }
    setPendingDocs([]);
    return results;
  }

  function removePendingDoc(index: number) {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum 10MB.");
        continue;
      }
      setPendingDocs((prev) => [...prev, { file, name: file.name }]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="shrink-0 border-b border-border-primary px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-text-primary">
            {thread.title}
          </h2>
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

        {/* Breadcrumb: linked entities + participants */}
        <ThreadBreadcrumb
          project={linkedProject}
          deal={linkedDeal}
          contact={linkedContact}
          maEntity={linkedMaEntity}
          prospectId={linkedProspectId}
          prospectName={linkedProspectName}
          company={thread.company}
          participants={thread.participants}
          onLink={() => setShowEntityPicker(true)}
          onUnlink={handleUnlinkEntity}
          linkingInProgress={linkingEntity}
        />

        {/* Unified entity search picker */}
        {showEntityPicker && (
          <div className="relative mt-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => searchEntities(e.target.value)}
                placeholder="Search deals, projects, contacts, prospects..."
                className="w-80 rounded border border-border-primary bg-surface-secondary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowEntityPicker(false);
                  setEntitySearch("");
                  setEntityResults([]);
                }}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
            {entitySearch.length >= 2 && (
              <div className="absolute top-8 left-0 z-20 w-80 rounded-md border border-border-primary bg-surface-primary shadow-lg max-h-60 overflow-y-auto">
                {searchingEntities && (
                  <p className="px-3 py-2 text-[10px] text-text-muted">Searching...</p>
                )}
                {entityResults.map((t) => {
                  // Check if this entity is already linked
                  const isLinked =
                    (t.type === "deal" && linkedDealId === t.id) ||
                    (t.type === "project" && linkedProjectId === t.id) ||
                    (t.type === "contact" && linkedContactId2 === t.id) ||
                    (t.type === "prospect" && linkedProspectId === t.id) ||
                    (t.type === "ma_entity" && linkedMaEntityId === t.id);

                  return (
                    <button
                      key={`${t.type}-${t.id}`}
                      onClick={() => !isLinked && handleLinkEntity(t)}
                      disabled={linkingEntity || isLinked}
                      className={`w-full px-3 py-1.5 text-left text-xs transition-colors flex items-center gap-2 ${
                        isLinked
                          ? "text-text-muted bg-surface-tertiary/50 cursor-default"
                          : "text-text-primary hover:bg-surface-tertiary"
                      }`}
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                        t.type === "deal" ? "bg-accent-primary/15 text-accent-primary"
                        : t.type === "prospect" ? "bg-blue-500/15 text-blue-400"
                        : t.type === "project" ? "bg-violet-500/15 text-violet-400"
                        : t.type === "contact" ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {t.type === "ma_entity" ? "M&A" : t.type}
                      </span>
                      <span className="truncate">{t.title}</span>
                      {t.subtitle && <span className="text-text-muted shrink-0">· {t.subtitle}</span>}
                      {isLinked && <span className="text-[9px] text-text-muted ml-auto">linked</span>}
                    </button>
                  );
                })}
                {!searchingEntities && entityResults.length === 0 && (
                  <p className="px-3 py-2 text-[10px] text-text-muted">No results found</p>
                )}
              </div>
            )}
          </div>
        )}
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

      {/* Follow-ups panel — outside scroll area so checkboxes stay accessible */}
      <ThreadFollowUps
        key={followUpKey}
        threadId={thread.thread_id}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
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
                        {msg.attachments.map((url, i) => {
                          const isDoc = /\.(pdf|docx?|doc)(\?|$)/i.test(url);
                          if (isDoc) {
                            const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Document");
                            return (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-xs text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-colors"
                              >
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                <span className="max-w-[200px] truncate">{name}</span>
                              </a>
                            );
                          }
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt="attachment"
                                className="max-h-48 max-w-xs rounded-md border border-border-primary object-contain"
                              />
                            </a>
                          );
                        })}
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
                      onChange={(e) => { setTaskDesc(e.target.value); setTaskError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelTask();
                      }}
                      rows={Math.min(taskDesc.split("\n").length + 1, 8)}
                      autoFocus
                      placeholder="One task per line..."
                      className="w-full resize-none rounded border border-border-primary bg-surface-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                    />
                    {taskError && (
                      <p className="text-[10px] text-red-400">{taskError}</p>
                    )}
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
                {/* Task saved confirmation flash */}
                {taskSavedFlash === msg.conversation_id && (
                  <div className="mt-2 flex items-center gap-1.5 text-emerald-400 animate-in fade-in duration-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span className="text-[10px] font-medium">Task saved</span>
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
                    {/* Delete button */}
                    {editingId !== msg.conversation_id && (
                      <button
                        onClick={() => handleDelete(msg)}
                        disabled={deletingId === msg.conversation_id}
                        title={msg.role === "user" ? "Delete message & response" : "Delete message"}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-red transition-opacity disabled:opacity-50"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
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

                {/* Emoji reactions (assistant messages) */}
                {msg.role === "assistant" && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {msg.reaction ? (
                      <button
                        onClick={() => handleReaction(msg.conversation_id, null)}
                        className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-sm hover:bg-accent-primary/20 transition-colors"
                        title="Remove reaction"
                      >
                        {MESSAGE_REACTIONS.find((r) => r.value === msg.reaction)?.emoji}
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {MESSAGE_REACTIONS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleReaction(msg.conversation_id, r.value)}
                            className="rounded-full px-1 py-0.5 text-sm hover:bg-surface-secondary transition-colors"
                            title={r.value.replace("_", " ")}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Right-click context menu for selected text actions */}
        {contextMenu && (
          <div
            className="fixed z-50 rounded-lg border border-border-primary bg-surface-secondary shadow-lg py-1 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {!contextMenu.showContactPicker ? (
              <>
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
                <button
                  onClick={showAgendaContactPicker}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Add to Meeting Agenda
                </button>
                <button
                  onClick={askStrategistFromSelection}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  Ask Strategist
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-text-muted mb-1.5">Add to whose agenda?</p>
                <input
                  type="text"
                  value={agendaContactSearch}
                  onChange={(e) => searchAgendaContacts(e.target.value)}
                  placeholder="Search contacts..."
                  autoFocus
                  className="w-full rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none mb-1"
                />
                <div className="max-h-[160px] overflow-y-auto">
                  {agendaSearching && (
                    <p className="text-[10px] text-text-muted py-1">Searching...</p>
                  )}
                  {agendaContactResults.map((c) => (
                    <button
                      key={c.contact_id}
                      onClick={() => addToContactAgenda(c.contact_id)}
                      disabled={agendaSaving}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-text-primary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
                    >
                      <span className="font-medium truncate">{c.name}</span>
                      {c.company && (
                        <span className="text-text-muted truncate text-[10px]">{c.company}</span>
                      )}
                    </button>
                  ))}
                  {!agendaSearching && agendaContactResults.length === 0 && agendaContactSearch.length >= 2 && (
                    <p className="text-[10px] text-text-muted py-1">No contacts found</p>
                  )}
                  {!agendaSearching && agendaContactResults.length === 0 && agendaContactSearch.length < 2 && threadContacts.length === 0 && (
                    <p className="text-[10px] text-text-muted py-1">Type to search contacts</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meeting detected prompt */}
        {meetingPrompt && (
          <div className="mx-auto max-w-[80%] rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-accent-primary/15 p-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Meeting Detected</p>
                <p className="mt-0.5 text-xs text-text-secondary">{meetingPrompt.title}</p>
                {meetingPrompt.attendees.length > 0 && (
                  <p className="mt-1 text-[10px] text-text-muted">
                    With: {meetingPrompt.attendees.map((a) => a.name).join(", ")}
                  </p>
                )}
                {meetingPrompt.suggested_agenda && meetingPrompt.suggested_agenda.length > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Suggested Agenda</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {meetingPrompt.suggested_agenda.map((item, i) => (
                        <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1">
                          <span className="text-text-muted mt-px">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setMeetingPrompt(null)}
                  className="rounded px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleCreateMeeting}
                  disabled={creatingMeeting}
                  className="rounded-md bg-accent-primary px-3 py-1 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
                >
                  {creatingMeeting ? "Creating..." : "Create Meeting"}
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Catch-up banner at bottom so it's visible without scrolling */}
        <ThreadCatchup
          threadId={thread.thread_id}
          messageCount={thread.message_count}
          initialCatchup={initialCatchup}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-2 rounded-lg bg-status-red/10 p-2 text-xs text-status-red">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border-primary px-6 py-3">
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

        {/* Pending document previews */}
        {pendingDocs.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingDocs.map((doc, i) => (
              <div
                key={i}
                className="group/doc flex items-center gap-1.5 rounded-md border border-border-primary bg-surface-secondary px-2.5 py-1.5"
              >
                <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="max-w-[160px] truncate text-xs text-text-secondary">{doc.name}</span>
                <button
                  onClick={() => removePendingDoc(i)}
                  className="ml-1 text-text-muted hover:text-status-red transition-colors opacity-0 group-hover/doc:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for documents */}
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          onChange={handleDocSelect}
        />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResizeTextarea(e.target);
          }}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            handlePaste(e);
            // Auto-resize after text paste settles
            setTimeout(() => {
              if (textareaRef.current) autoResizeTextarea(textareaRef.current);
            }, 0);
          }}
          placeholder={pendingImages.length > 0 || pendingDocs.length > 0 ? "Add a message (optional)..." : placeholder}
          rows={4}
          maxLength={5000}
          className="w-full resize-y rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none min-h-[100px] max-h-[40vh]"
        />
        {/* Toolbar row: Attach + Send */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={loading}
            title="Attach PDF or Word document"
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            Attach PDF / Doc
          </button>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={moreToAdd}
                  onChange={(e) => {
                    setMoreToAdd(e.target.checked);
                    // When unchecking with queued chunks, auto-send
                    if (!e.target.checked && inputChunks.length > 0) {
                      handleSend({ flushQueue: true });
                    }
                  }}
                  disabled={loading}
                  className="h-3.5 w-3.5 accent-accent-primary"
                />
                <span className="text-xs text-text-muted">
                  {moreToAdd && inputChunks.length > 0
                    ? `${inputChunks.length} chunk${inputChunks.length > 1 ? "s" : ""} queued — uncheck to send`
                    : "More to paste"}
                </span>
            </label>
            <button
              onClick={() => {
                // If chunks are queued and input is empty, flush the queue
                if (moreToAdd && inputChunks.length > 0 && !input.trim()) {
                  handleSend({ flushQueue: true });
                } else {
                  handleSend();
                }
              }}
              disabled={loading || (!input.trim() && pendingImages.length === 0 && pendingDocs.length === 0 && inputChunks.length === 0)}
              title="Enter to send"
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {uploadingImages
                ? "Uploading..."
                : moreToAdd && inputChunks.length > 0 && !input.trim()
                ? "Send Chunks"
                : moreToAdd
                ? "Queue Chunk"
                : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
