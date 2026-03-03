/**
 * RAG Summarizer — Summarization ladder for RevSignal.
 *
 * Levels:
 *  1. Raw → Summary: Conversation raw_text → ai_summary (3-5 sentences)
 *  2. Summary → Deal Brief: All ai_summaries for a deal → rolling deal brief
 *  3. Deal Briefs → Weekly Digest: All deal briefs → weekly strategy digest
 *
 * Only the summarizer touches raw_text. Agents read ai_summary and brief_text.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  retrieveUnsummarizedConversations,
  retrieveDealConversationsForBrief,
} from "./retriever";
import type { Deal } from "@/types/database";

// ── Constants ──────────────────────────────────────────────────────────

/** Max characters of raw_text to send to Claude for summarization.
 *  ~50K chars is ~12K tokens, well within context limits. */
const MAX_RAW_TEXT_CHARS = 50_000;

// ── Conversation Summarization ─────────────────────────────────────────

const CONVERSATION_SUMMARY_PROMPT = `You are an AI assistant for a B2B sales leader. Summarize this conversation in 3-5 concise sentences.

Focus on:
- Key decisions or commitments made
- Action items (who owes what, by when)
- Objections or concerns raised
- Pricing or terms discussed
- Competitor mentions
- Next steps

Do NOT invent details not present in the text. If something is unclear, say so.
State facts directly — no filler phrases like "The conversation covered..." or "In this exchange..."`;

/**
 * Summarize a single conversation's raw_text into an ai_summary.
 * Returns the summary text, or null if summarization fails.
 */
export async function summarizeConversation(
  rawText: string,
  metadata: { channel: string; subject?: string | null; contactName?: string }
): Promise<string | null> {
  const anthropic = getAnthropic();

  const contextHeader = [
    `Channel: ${metadata.channel}`,
    metadata.subject ? `Subject: ${metadata.subject}` : null,
    metadata.contactName ? `Contact: ${metadata.contactName}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  // Truncate oversized raw text to prevent context window overflow and cost spikes
  const truncatedText =
    rawText.length > MAX_RAW_TEXT_CHARS
      ? rawText.slice(0, MAX_RAW_TEXT_CHARS) + "\n\n[truncated — original exceeded 50K characters]"
      : rawText;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: CONVERSATION_SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: `${contextHeader}\n\n${truncatedText}`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type === "text") {
      return text.text;
    }
    return null;
  } catch (error) {
    console.error(
      "[rag/summarizer] Conversation summarization failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Process all unsummarized conversations for a user.
 * Writes ai_summary back to the conversations table.
 * Returns count of conversations processed.
 */
export async function processUnsummarizedConversations(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number } = {}
): Promise<{ processed: number; failed: number }> {
  const conversations = await retrieveUnsummarizedConversations(
    supabase,
    userId,
    options
  );

  let processed = 0;
  let failed = 0;

  for (const convo of conversations) {
    if (!convo.raw_text) continue;

    const summary = await summarizeConversation(convo.raw_text, {
      channel: convo.channel,
      subject: convo.subject,
    });

    if (summary) {
      const { error } = await supabase
        .from("conversations")
        .update({ ai_summary: summary, updated_at: new Date().toISOString() })
        .eq("conversation_id", convo.conversation_id)
        .eq("user_id", userId);

      if (error) {
        console.error(
          "[rag/summarizer] Failed to write summary for conversation",
          convo.conversation_id,
          error.message
        );
        failed++;
      } else {
        processed++;
      }
    } else {
      failed++;
    }
  }

  return { processed, failed };
}

// ── Deal Brief Generation ──────────────────────────────────────────────

const DEAL_BRIEF_PROMPT = `You are an AI strategist for a B2B sales leader building a data licensing (DaaS) business.
Generate a rolling deal brief — a concise summary of the entire deal history.

The brief should cover:
- Current deal stage and momentum (advancing, stalled, at risk)
- Key contacts and their roles/attitudes
- Core needs and use cases discussed
- Pricing/terms discussed (only what's in the data — never invent numbers)
- Objections or blockers raised
- Recent activity and next steps
- Competitive dynamics (if any competitor was mentioned)

Format: 2-3 short paragraphs. Direct, factual, no filler.
Cite dates when referencing specific conversations.
If data is thin, say so — don't pad with speculation.`;

/**
 * Generate or refresh a deal brief from all summarized conversations.
 * Writes to the deal_briefs table (upsert by deal_id + user_id).
 */
export async function generateDealBrief(
  supabase: SupabaseClient,
  userId: string,
  deal: Deal
): Promise<string | null> {
  const conversations = await retrieveDealConversationsForBrief(
    supabase,
    userId,
    deal.deal_id
  );

  if (conversations.length === 0) {
    return null;
  }

  const anthropic = getAnthropic();

  // Build conversation timeline for the prompt
  const timeline = conversations
    .map((c) => {
      const parts = [
        `[${c.date}] ${c.channel.toUpperCase()}`,
        c.subject ? `Subject: ${c.subject}` : null,
        c.ai_summary || "(no summary available)",
      ];
      return parts.filter(Boolean).join(" — ");
    })
    .join("\n\n");

  const dealHeader = [
    `Company: ${deal.company}`,
    `Stage: ${deal.stage}`,
    deal.acv ? `ACV: $${deal.acv.toLocaleString()}` : null,
    deal.product_tier ? `Product: ${deal.product_tier}` : null,
    deal.deployment_method ? `Deployment: ${deal.deployment_method}` : null,
    `Contacts: ${(deal.contacts || []).map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ") || "none listed"}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: DEAL_BRIEF_PROMPT,
      messages: [
        {
          role: "user",
          content: `DEAL INFO:\n${dealHeader}\n\nCONVERSATION HISTORY (${conversations.length} conversations):\n${timeline}`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== "text") return null;

    const briefText = text.text;
    const sourceConversationIds = conversations.map(
      (c) => c.conversation_id
    );
    const now = new Date().toISOString();

    // Atomic upsert — avoids TOCTOU race if cron and UI trigger simultaneously.
    // deal_id has a UNIQUE constraint in the schema (one brief per deal).
    const { error: upsertError } = await supabase.from("deal_briefs").upsert(
      {
        deal_id: deal.deal_id,
        user_id: userId,
        brief_text: briefText,
        source_conversations: sourceConversationIds,
        last_updated: now,
      },
      { onConflict: "deal_id" }
    );

    if (upsertError) {
      console.error(
        "[rag/summarizer] Deal brief upsert failed for",
        deal.company,
        upsertError.message
      );
      return null;
    }

    return briefText;
  } catch (error) {
    console.error(
      "[rag/summarizer] Deal brief generation failed for",
      deal.company,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Refresh deal briefs for all active deals that have new activity
 * since their last brief update. Used by the nightly cron job.
 */
export async function refreshStaleDealBriefs(
  supabase: SupabaseClient,
  userId: string
): Promise<{ refreshed: string[]; skipped: string[]; failed: string[] }> {
  const refreshed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  // Get all active deals
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", userId)
    .in("stage", [
      "lead",
      "qualified",
      "discovery",
      "poc_trial",
      "proposal",
      "negotiation",
    ]);

  if (!deals || deals.length === 0) return { refreshed, skipped, failed };

  for (const deal of deals as Deal[]) {
    // Check if brief needs refresh: compare last_activity_date vs brief.last_updated
    const { data: brief } = await supabase
      .from("deal_briefs")
      .select("last_updated")
      .eq("deal_id", deal.deal_id)
      .eq("user_id", userId)
      .maybeSingle();

    // Skip if brief is already up-to-date
    if (brief && brief.last_updated >= deal.last_activity_date) {
      skipped.push(deal.company);
      continue;
    }

    // Check if there are any summarized conversations to work with
    const { count } = await supabase
      .from("conversations")
      .select("conversation_id", { count: "exact", head: true })
      .eq("deal_id", deal.deal_id)
      .eq("user_id", userId)
      .not("ai_summary", "is", null);

    if (!count || count === 0) {
      skipped.push(deal.company);
      continue;
    }

    const result = await generateDealBrief(supabase, userId, deal);
    if (result) {
      refreshed.push(deal.company);
    } else {
      failed.push(deal.company);
    }
  }

  return { refreshed, skipped, failed };
}
