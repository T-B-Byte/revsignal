/**
 * Teams Ingestion Pipeline — Chats & Call Recordings
 *
 * Pulls Teams messages and call transcripts via Microsoft Graph,
 * matches them to contacts/deals, and stores as conversations.
 *
 * Used by: api/cron/ingest-teams (every 15 min)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getTeamsChats,
  getTeamsChatMessages,
  getCallTranscripts,
} from "@/lib/integrations/microsoft-graph";
import { summarizeConversation } from "@/lib/rag/summarizer";
import type { ChannelType } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

export interface IngestResult {
  messagesIngested: number;
  transcriptsIngested: number;
  duplicatesSkipped: number;
  matchedToDeals: number;
  matchedToContacts: number;
  errors: string[];
}

// ── Teams Chat Ingestion ──────────────────────────────────────────────

/**
 * Ingest recent Teams chat messages for a user.
 * Deduplicates by external_id, matches to contacts by display name,
 * and creates conversation records.
 */
export async function ingestTeamsChats(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string; summarize?: boolean } = {}
): Promise<IngestResult> {
  const result: IngestResult = {
    messagesIngested: 0,
    transcriptsIngested: 0,
    duplicatesSkipped: 0,
    matchedToDeals: 0,
    matchedToContacts: 0,
    errors: [],
  };

  const chatsResult = await getTeamsChats(supabase, userId, { top: 30 });
  if (chatsResult.source === "manual") {
    result.errors.push(chatsResult.error ?? "Teams not connected");
    return result;
  }

  // Load contacts for matching
  const { data: contacts } = await supabase
    .from("contacts")
    .select("contact_id, name, company")
    .eq("user_id", userId)
    .eq("is_internal", false);

  const contactsByName = new Map(
    (contacts ?? []).map((c) => [c.name.toLowerCase(), c])
  );

  for (const chat of chatsResult.data) {
    try {
      const messagesResult = await getTeamsChatMessages(
        supabase,
        userId,
        chat.id,
        { top: 20, since: options.since }
      );

      if (messagesResult.source === "manual") continue;

      for (const msg of messagesResult.data) {
        // Dedup check
        const { data: existing } = await supabase
          .from("ingested_messages")
          .select("id")
          .eq("source", "teams-chat")
          .eq("external_id", msg.id)
          .maybeSingle();

        if (existing) {
          result.duplicatesSkipped++;
          continue;
        }

        // Match sender to contact
        const matchedContact = contactsByName.get(msg.from.toLowerCase());

        // Match to deal via contact's company
        let matchedDealId: string | null = null;
        if (matchedContact) {
          const { data: deal } = await supabase
            .from("deals")
            .select("deal_id")
            .eq("user_id", userId)
            .ilike("company", escapeIlike(matchedContact.company))
            .limit(1)
            .maybeSingle();
          matchedDealId = deal?.deal_id ?? null;
        }

        // Generate summary if requested
        let aiSummary: string | null = null;
        if (options.summarize && msg.body.length > 100) {
          aiSummary = await summarizeConversation(msg.body, {
            channel: "teams",
            subject: chat.topic,
            contactName: msg.from,
          });
        }

        // Store conversation
        await supabase.from("conversations").insert({
          user_id: userId,
          contact_id: matchedContact?.contact_id ?? null,
          deal_id: matchedDealId,
          date: msg.sentAt,
          channel: "teams" as ChannelType,
          subject: chat.topic,
          raw_text: msg.body,
          ai_summary: aiSummary,
          action_items: [],
          external_id: msg.id,
        });

        // Store ingestion record — catch duplicate errors from race conditions
        const { error: ingestError } = await supabase.from("ingested_messages").insert({
          user_id: userId,
          source: "teams-chat",
          external_id: msg.id,
          raw_content: msg.body,
          processed: !!aiSummary,
          matched_contact_id: matchedContact?.contact_id ?? null,
          matched_deal_id: matchedDealId,
          processed_at: aiSummary ? new Date().toISOString() : null,
        });

        if (ingestError?.code === "23505") {
          result.duplicatesSkipped++;
          continue;
        }

        result.messagesIngested++;
        if (matchedDealId) result.matchedToDeals++;
        if (matchedContact) result.matchedToContacts++;
      }
    } catch (error) {
      result.errors.push(
        `Chat ${chat.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

// ── Teams Call Transcript Ingestion ──────────────────────────────────

/**
 * Ingest Teams call transcripts for a user.
 * Deduplicates by callId, creates conversation records with channel "call".
 */
export async function ingestTeamsCallTranscripts(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string; summarize?: boolean } = {}
): Promise<IngestResult> {
  const result: IngestResult = {
    messagesIngested: 0,
    transcriptsIngested: 0,
    duplicatesSkipped: 0,
    matchedToDeals: 0,
    matchedToContacts: 0,
    errors: [],
  };

  const transcriptsResult = await getCallTranscripts(supabase, userId, {
    since: options.since,
    top: 10,
  });

  if (transcriptsResult.source === "manual") {
    result.errors.push(transcriptsResult.error ?? "Teams not connected");
    return result;
  }

  // Load contacts for matching
  const { data: contacts } = await supabase
    .from("contacts")
    .select("contact_id, name, company, email")
    .eq("user_id", userId)
    .eq("is_internal", false);

  const contactsByEmail = new Map(
    (contacts ?? [])
      .filter((c) => c.email)
      .map((c) => [c.email!.toLowerCase(), c])
  );

  for (const transcript of transcriptsResult.data) {
    try {
      // Dedup check
      const { data: existing } = await supabase
        .from("ingested_messages")
        .select("id")
        .eq("source", "teams-call")
        .eq("external_id", transcript.callId)
        .maybeSingle();

      if (existing) {
        result.duplicatesSkipped++;
        continue;
      }

      // Match participants to contacts
      let matchedContact: { contact_id: string; name: string; company: string; email: string | null } | null = null;
      for (const participant of transcript.participants) {
        const match = contactsByEmail.get(participant.toLowerCase());
        if (match) {
          matchedContact = match;
          break;
        }
      }

      // Match to deal via contact's company
      let matchedDealId: string | null = null;
      if (matchedContact) {
        const { data: deal } = await supabase
          .from("deals")
          .select("deal_id")
          .eq("user_id", userId)
          .ilike("company", escapeIlike(matchedContact.company))
          .limit(1)
          .maybeSingle();
        matchedDealId = deal?.deal_id ?? null;
      }

      // Generate summary if requested
      let aiSummary: string | null = null;
      if (options.summarize && transcript.transcriptContent.length > 100) {
        aiSummary = await summarizeConversation(transcript.transcriptContent, {
          channel: "call",
          contactName: matchedContact?.name,
        });
      }

      // Store conversation
      await supabase.from("conversations").insert({
        user_id: userId,
        contact_id: matchedContact?.contact_id ?? null,
        deal_id: matchedDealId,
        date: transcript.startTime,
        channel: "call" as ChannelType,
        subject: `Teams call — ${transcript.participants.join(", ")}`,
        raw_text: transcript.transcriptContent,
        ai_summary: aiSummary,
        action_items: [],
        external_id: transcript.callId,
      });

      // Store ingestion record — catch duplicate errors from race conditions
      const { error: ingestError } = await supabase.from("ingested_messages").insert({
        user_id: userId,
        source: "teams-call",
        external_id: transcript.callId,
        raw_content: transcript.transcriptContent,
        processed: !!aiSummary,
        matched_contact_id: matchedContact?.contact_id ?? null,
        matched_deal_id: matchedDealId,
        processed_at: aiSummary ? new Date().toISOString() : null,
      });

      if (ingestError?.code === "23505") {
        result.duplicatesSkipped++;
        continue;
      }

      result.transcriptsIngested++;
      if (matchedDealId) result.matchedToDeals++;
      if (matchedContact) result.matchedToContacts++;
    } catch (error) {
      result.errors.push(
        `Transcript ${transcript.callId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

/** Escape ILIKE wildcard characters to prevent unintended pattern matching. */
function escapeIlike(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}
