/**
 * Transcript Processing Pipeline
 *
 * Processes call transcripts (from Teams, Plaud, or manual upload)
 * through the Call Analyst agent to extract structured data:
 *  - Summary
 *  - Action items (with owner + due date)
 *  - Objections raised
 *  - Competitor mentions
 *  - Pricing discussed
 *  - Next steps
 *
 * Then writes results to conversations, action_items, and deal_briefs.
 *
 * Used by: api/cron/ingest-transcripts (daily 6:00 AM),
 *          api/webhooks/plaud (on webhook trigger)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  analyzeTranscript,
  type TranscriptAnalysis,
  type TranscriptMetadata,
} from "@/lib/agents/call-analyst";
import { generateDealBrief } from "@/lib/rag/summarizer";
import type { ChannelType, Deal } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

export interface TranscriptInput {
  /** Raw transcript text */
  text: string;
  /** Source system: teams, plaud, manual */
  source: "teams" | "plaud" | "manual";
  /** External ID for dedup */
  externalId?: string;
  /** Recording date */
  date: string;
  /** Channel type for the conversation record */
  channel: ChannelType;
  /** Known contact name (if available) */
  contactName?: string;
  /** Known company (if available) */
  company?: string;
  /** Known deal ID (if already matched) */
  dealId?: string;
  /** Known contact ID (if already matched) */
  contactId?: string;
  /** Optional title/subject */
  title?: string;
}

export interface TranscriptProcessResult {
  conversationId: string | null;
  analysis: TranscriptAnalysis | null;
  actionItemsCreated: number;
  dealBriefRefreshed: boolean;
  error?: string;
}

// ── Core Processor ────────────────────────────────────────────────────

/**
 * Process a single transcript end-to-end:
 *  1. Dedup check
 *  2. Run through Call Analyst
 *  3. Create conversation record
 *  4. Create action items
 *  5. Refresh deal brief (if matched to a deal)
 *  6. Log agent activity
 */
export async function processTranscript(
  supabase: SupabaseClient,
  userId: string,
  input: TranscriptInput
): Promise<TranscriptProcessResult> {
  // Dedup check if external ID provided
  if (input.externalId) {
    const { data: existing } = await supabase
      .from("ingested_messages")
      .select("id")
      .eq("source", input.source)
      .eq("external_id", input.externalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return {
        conversationId: null,
        analysis: null,
        actionItemsCreated: 0,
        dealBriefRefreshed: false,
        error: "Already processed",
      };
    }
  }

  // Auto-match to contact if not provided
  let contactId = input.contactId ?? null;
  let dealId = input.dealId ?? null;

  if (!contactId && input.contactName) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("contact_id, company")
      .eq("user_id", userId)
      .ilike("name", escapeIlike(input.contactName))
      .limit(1)
      .maybeSingle();

    if (contact) {
      contactId = contact.contact_id;
      // Also match deal via company if not provided
      if (!dealId) {
        const { data: deal } = await supabase
          .from("deals")
          .select("deal_id")
          .eq("user_id", userId)
          .ilike("company", escapeIlike(contact.company))
          .limit(1)
          .maybeSingle();
        dealId = deal?.deal_id ?? null;
      }
    }
  }

  // Run through Call Analyst
  const metadata: TranscriptMetadata = {
    dealId: dealId ?? undefined,
    contactName: input.contactName,
    company: input.company,
    date: input.date,
    channel: input.channel === "in_person" ? "call" : (input.channel as "call" | "teams"),
  };

  const analysis = await analyzeTranscript(
    supabase,
    userId,
    input.text,
    metadata
  );

  // Create conversation record
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      contact_id: contactId,
      deal_id: dealId,
      date: input.date,
      channel: input.channel,
      subject: input.title ?? (analysis ? `Call — ${input.source}` : null),
      raw_text: input.text,
      ai_summary: analysis?.summary ?? null,
      action_items: analysis?.actionItems.map((a) => ({
        description: a.description,
        owner: a.owner,
        due_date: a.dueDate,
      })) ?? [],
      external_id: input.externalId ?? null,
    })
    .select("conversation_id")
    .single();

  if (convoError || !conversation) {
    console.error(
      "[transcript-processor] Failed to create conversation:",
      convoError?.message
    );
    return {
      conversationId: null,
      analysis,
      actionItemsCreated: 0,
      dealBriefRefreshed: false,
      error: convoError?.message ?? "Failed to create conversation",
    };
  }

  // Create action items
  let actionItemsCreated = 0;
  if (analysis) {
    const actionItemRows = analysis.actionItems
      .filter((a) => a.description)
      .map((a) => ({
        user_id: userId,
        deal_id: dealId,
        contact_id: contactId,
        description: a.description,
        owner: a.owner,
        due_date: a.dueDate,
        status: "pending" as const,
        source_conversation_id: conversation.conversation_id,
        escalation_level: "green" as const,
      }));

    if (actionItemRows.length > 0) {
      const { error: aiError } = await supabase
        .from("action_items")
        .insert(actionItemRows);

      if (!aiError) {
        actionItemsCreated = actionItemRows.length;
      }
    }
  }

  // Store ingestion record
  if (input.externalId) {
    await supabase.from("ingested_messages").insert({
      user_id: userId,
      source: input.source,
      external_id: input.externalId,
      raw_content: input.text,
      processed: true,
      matched_contact_id: contactId,
      matched_deal_id: dealId,
      processed_at: new Date().toISOString(),
    });
  }

  // Update deal last_activity_date
  if (dealId) {
    await supabase
      .from("deals")
      .update({ last_activity_date: input.date, updated_at: new Date().toISOString() })
      .eq("deal_id", dealId)
      .eq("user_id", userId);
  }

  // Refresh deal brief if matched to a deal
  let dealBriefRefreshed = false;
  if (dealId) {
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .single();

    if (deal) {
      const brief = await generateDealBrief(supabase, userId, deal as Deal);
      dealBriefRefreshed = !!brief;
    }
  }

  // Log agent activity
  await supabase.from("agent_logs").insert({
    user_id: userId,
    agent_name: "call-analyst",
    action: "transcript_processed",
    input_context: {
      source: input.source,
      externalId: input.externalId,
      channel: input.channel,
      textLength: input.text.length,
    },
    output: analysis?.summary ?? "No analysis generated",
    sources_cited: input.externalId
      ? [`${input.source}:${input.externalId}`]
      : [],
    tokens_used: analysis?.tokensUsed ?? null,
  });

  return {
    conversationId: conversation.conversation_id,
    analysis,
    actionItemsCreated,
    dealBriefRefreshed,
  };
}

// ── Batch Processor ──────────────────────────────────────────────────

/**
 * Process multiple transcripts sequentially.
 * Used by the daily cron job for batch transcript processing.
 */
export async function processTranscriptBatch(
  supabase: SupabaseClient,
  userId: string,
  transcripts: TranscriptInput[]
): Promise<{
  processed: number;
  failed: number;
  results: TranscriptProcessResult[];
}> {
  const results: TranscriptProcessResult[] = [];
  let processed = 0;
  let failed = 0;

  for (const transcript of transcripts) {
    try {
      const result = await processTranscript(supabase, userId, transcript);
      results.push(result);
      if (result.conversationId) {
        processed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(
        "[transcript-processor] Batch item failed:",
        error instanceof Error ? error.message : error
      );
      results.push({
        conversationId: null,
        analysis: null,
        actionItemsCreated: 0,
        dealBriefRefreshed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failed++;
    }
  }

  return { processed, failed, results };
}

/** Escape ILIKE wildcard characters to prevent unintended pattern matching. */
function escapeIlike(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}
