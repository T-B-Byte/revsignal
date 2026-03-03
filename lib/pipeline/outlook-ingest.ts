/**
 * Outlook Ingestion Pipeline — Email & Calendar
 *
 * Pulls emails and calendar events via Microsoft Graph,
 * matches them to contacts/deals, and stores as conversations.
 *
 * Used by: api/cron/ingest-outlook (every 15 min)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getOutlookEmails,
  getCalendarEvents,
} from "@/lib/integrations/microsoft-graph";
import { summarizeConversation } from "@/lib/rag/summarizer";
import type { ChannelType } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

export interface EmailIngestResult {
  emailsIngested: number;
  eventsIngested: number;
  duplicatesSkipped: number;
  matchedToDeals: number;
  matchedToContacts: number;
  errors: string[];
}

// ── Email Ingestion ────────────────────────────────────────────────────

/**
 * Ingest recent Outlook emails for a user.
 * Deduplicates by message ID, matches to contacts by email address,
 * and creates conversation records.
 */
export async function ingestOutlookEmails(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string; summarize?: boolean; top?: number } = {}
): Promise<EmailIngestResult> {
  const result: EmailIngestResult = {
    emailsIngested: 0,
    eventsIngested: 0,
    duplicatesSkipped: 0,
    matchedToDeals: 0,
    matchedToContacts: 0,
    errors: [],
  };

  const emailsResult = await getOutlookEmails(supabase, userId, {
    top: options.top ?? 50,
    since: options.since,
  });

  if (emailsResult.source === "manual") {
    result.errors.push(emailsResult.error ?? "Outlook not connected");
    return result;
  }

  // Load contacts for matching by email
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

  for (const email of emailsResult.data) {
    try {
      // Dedup check
      const { data: existing } = await supabase
        .from("ingested_messages")
        .select("id")
        .eq("source", "outlook-email")
        .eq("external_id", email.id)
        .maybeSingle();

      if (existing) {
        result.duplicatesSkipped++;
        continue;
      }

      // Extract sender email address from "Name <email>" format
      const senderEmail = extractEmail(email.from);
      const matchedContact = senderEmail
        ? contactsByEmail.get(senderEmail.toLowerCase()) ?? null
        : null;

      // Also check recipients for outbound emails
      let contactFromRecipients: typeof matchedContact = null;
      if (!matchedContact) {
        for (const recipient of email.toRecipients) {
          const recipientEmail = extractEmail(recipient);
          if (recipientEmail) {
            const match = contactsByEmail.get(recipientEmail.toLowerCase());
            if (match) {
              contactFromRecipients = match;
              break;
            }
          }
        }
      }

      const resolvedContact = matchedContact ?? contactFromRecipients;

      // Match to deal via contact's company
      let matchedDealId: string | null = null;
      if (resolvedContact) {
        const { data: deal } = await supabase
          .from("deals")
          .select("deal_id")
          .eq("user_id", userId)
          .ilike("company", escapeIlike(resolvedContact.company))
          .limit(1)
          .maybeSingle();
        matchedDealId = deal?.deal_id ?? null;
      }

      // Generate summary if requested
      let aiSummary: string | null = null;
      if (options.summarize && email.body.length > 100) {
        aiSummary = await summarizeConversation(email.body, {
          channel: "email",
          subject: email.subject,
          contactName: resolvedContact?.name ?? email.from,
        });
      }

      // Store conversation
      await supabase.from("conversations").insert({
        user_id: userId,
        contact_id: resolvedContact?.contact_id ?? null,
        deal_id: matchedDealId,
        date: email.receivedAt,
        channel: "email" as ChannelType,
        subject: email.subject,
        raw_text: email.body,
        ai_summary: aiSummary,
        action_items: [],
        external_id: email.id,
      });

      // Store ingestion record — catch duplicate errors from race conditions
      const { error: ingestError } = await supabase.from("ingested_messages").insert({
        user_id: userId,
        source: "outlook-email",
        external_id: email.id,
        raw_content: email.body,
        processed: !!aiSummary,
        matched_contact_id: resolvedContact?.contact_id ?? null,
        matched_deal_id: matchedDealId,
        processed_at: aiSummary ? new Date().toISOString() : null,
      });

      if (ingestError?.code === "23505") {
        result.duplicatesSkipped++;
        continue;
      }

      result.emailsIngested++;
      if (matchedDealId) result.matchedToDeals++;
      if (resolvedContact) result.matchedToContacts++;
    } catch (error) {
      result.errors.push(
        `Email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

// ── Calendar Event Ingestion ──────────────────────────────────────────

/**
 * Ingest upcoming calendar events to identify scheduled meetings.
 * Creates conversation records with channel "call" for online meetings.
 */
export async function ingestCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  options: { startDate?: string; endDate?: string } = {}
): Promise<EmailIngestResult> {
  const result: EmailIngestResult = {
    emailsIngested: 0,
    eventsIngested: 0,
    duplicatesSkipped: 0,
    matchedToDeals: 0,
    matchedToContacts: 0,
    errors: [],
  };

  const eventsResult = await getCalendarEvents(supabase, userId, {
    startDate: options.startDate,
    endDate: options.endDate,
    top: 50,
  });

  if (eventsResult.source === "manual") {
    result.errors.push(eventsResult.error ?? "Outlook not connected");
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

  for (const event of eventsResult.data) {
    try {
      // Dedup check
      const { data: existing } = await supabase
        .from("ingested_messages")
        .select("id")
        .eq("source", "outlook-calendar")
        .eq("external_id", event.id)
        .maybeSingle();

      if (existing) {
        result.duplicatesSkipped++;
        continue;
      }

      // Match attendees to contacts
      let matchedContact: { contact_id: string; name: string; company: string } | null = null;
      for (const attendee of event.attendees) {
        const match = contactsByName.get(attendee.toLowerCase());
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

      // Store ingestion record — catch duplicate errors from race conditions
      const { error: ingestError } = await supabase.from("ingested_messages").insert({
        user_id: userId,
        source: "outlook-calendar",
        external_id: event.id,
        raw_content: JSON.stringify({
          subject: event.subject,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          location: event.location,
          isOnlineMeeting: event.isOnlineMeeting,
        }),
        processed: true,
        matched_contact_id: matchedContact?.contact_id ?? null,
        matched_deal_id: matchedDealId,
        processed_at: new Date().toISOString(),
      });

      if (ingestError?.code === "23505") {
        result.duplicatesSkipped++;
        continue;
      }

      result.eventsIngested++;
      if (matchedDealId) result.matchedToDeals++;
      if (matchedContact) result.matchedToContacts++;
    } catch (error) {
      result.errors.push(
        `Event ${event.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

// ── Utility ──────────────────────────────────────────────────────────

/** Extract email address from "Name <email@domain.com>" format */
function extractEmail(formatted: string): string | null {
  const match = formatted.match(/<([^>]+)>/);
  if (match) return match[1];
  // If it's already a plain email
  if (formatted.includes("@")) return formatted.trim();
  return null;
}

/** Escape ILIKE wildcard characters to prevent unintended pattern matching. */
function escapeIlike(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}
