/**
 * Migrate meeting notes into StrategyGPT threads.
 *
 * - Consolidates Anna-related meeting notes into one "Anna Eliot" thread
 * - Creates a "Marty Fettig" thread
 * - Creates a "Ben Lefkowitz" thread
 * - All threads linked to pharosIQ account
 *
 * Run: npx tsx scripts/migrate-meetings-to-strategygpt.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/migrate-meetings-to-strategygpt.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DRY_RUN = process.env.DRY_RUN === "1";

interface MeetingNote {
  note_id: string;
  user_id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: { name: string; role?: string }[];
  content: string;
  ai_summary: string | null;
  tags: string[];
  deal_id: string | null;
  created_at: string;
}

// Map meeting_type to interaction_type
function meetingTypeToInteraction(meetingType: string): string {
  switch (meetingType) {
    case "one_on_one":
    case "team":
    case "strategy":
    case "cross_functional":
    case "board":
    case "standup":
      return "in_person_meeting";
    default:
      return "in_person_meeting";
  }
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE RUN ===");

  // Get all meeting notes
  const { data: notes, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .order("meeting_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch meeting notes:", error.message);
    process.exit(1);
  }

  if (!notes || notes.length === 0) {
    console.log("No meeting notes found.");
    return;
  }

  console.log(`Found ${notes.length} meeting notes total.`);

  // Find notes with Anna as attendee
  const annaNotes = (notes as MeetingNote[]).filter((n) =>
    n.attendees.some((a) => a.name.toLowerCase().includes("anna"))
  );
  console.log(`\nAnna-related notes: ${annaNotes.length}`);
  for (const n of annaNotes) {
    console.log(`  - "${n.title}" (${n.meeting_date})`);
  }

  // Find notes with Marty/Martin as attendee
  const martyNotes = (notes as MeetingNote[]).filter((n) =>
    n.attendees.some(
      (a) =>
        a.name.toLowerCase().includes("marty") ||
        a.name.toLowerCase().includes("martin fettig")
    )
  );
  console.log(`\nMarty-related notes: ${martyNotes.length}`);
  for (const n of martyNotes) {
    console.log(`  - "${n.title}" (${n.meeting_date})`);
  }

  // Find notes with Ben Lefkowitz as attendee
  const benNotes = (notes as MeetingNote[]).filter((n) =>
    n.attendees.some((a) => a.name.toLowerCase().includes("lefkowitz"))
  );
  console.log(`\nBen Lefkowitz-related notes: ${benNotes.length}`);
  for (const n of benNotes) {
    console.log(`  - "${n.title}" (${n.meeting_date})`);
  }

  if (DRY_RUN) {
    console.log("\n=== DRY RUN COMPLETE. Set DRY_RUN=0 or omit to execute. ===");
    return;
  }

  // We need a user_id — get it from the first meeting note
  const userId = notes[0].user_id;

  // Create threads and migrate notes
  const threads = [
    {
      contact_name: "Anna Eliot",
      contact_role: "CMO",
      company: "pharosIQ",
      notes: annaNotes,
    },
    {
      contact_name: "Marty Fettig",
      contact_role: "EVP Sales",
      company: "pharosIQ",
      notes: martyNotes,
    },
    {
      contact_name: "Ben Lefkowitz",
      contact_role: "VP Sales, EMEA & APAC",
      company: "pharosIQ",
      notes: benNotes,
    },
  ];

  for (const t of threads) {
    console.log(`\nCreating thread: ${t.contact_name} @ ${t.company}`);

    const { data: thread, error: createErr } = await supabase
      .from("coaching_threads")
      .insert({
        user_id: userId,
        title: t.contact_name,
        contact_name: t.contact_name,
        contact_role: t.contact_role,
        company: t.company,
        message_count: t.notes.length,
        last_message_at:
          t.notes.length > 0
            ? t.notes[t.notes.length - 1].created_at
            : new Date().toISOString(),
      })
      .select()
      .single();

    if (createErr || !thread) {
      console.error(`  Failed to create thread: ${createErr?.message}`);
      continue;
    }

    console.log(`  Created thread: ${thread.thread_id}`);

    // Migrate each meeting note as a coaching_conversation message
    for (const note of t.notes) {
      const interactionType = meetingTypeToInteraction(note.meeting_type);
      const attendeeStr = note.attendees.map((a) => a.name).join(", ");

      // Build the message content from the meeting note
      const parts: string[] = [];
      parts.push(`## ${note.title}`);
      parts.push(`**Date:** ${note.meeting_date}`);
      parts.push(`**Type:** ${note.meeting_type.replace(/_/g, " ")}`);
      if (attendeeStr) parts.push(`**Attendees:** ${attendeeStr}`);
      if (note.tags.length > 0) parts.push(`**Tags:** ${note.tags.join(", ")}`);
      parts.push("");
      parts.push(note.content);

      if (note.ai_summary) {
        parts.push("");
        parts.push("---");
        parts.push(`**AI Summary:** ${note.ai_summary}`);
      }

      const content = parts.join("\n");

      const { error: msgErr } = await supabase
        .from("coaching_conversations")
        .insert({
          user_id: userId,
          thread_id: thread.thread_id,
          role: "user",
          content,
          interaction_type: interactionType,
          context_used: null,
          sources_cited: [],
          tokens_used: null,
          created_at: note.created_at,
        });

      if (msgErr) {
        console.error(
          `  Failed to migrate note "${note.title}": ${msgErr.message}`
        );
      } else {
        console.log(`  Migrated: "${note.title}" as ${interactionType}`);
      }
    }
  }

  console.log("\n=== Migration complete ===");
}

main().catch(console.error);
