/**
 * Backfill thread briefs for all existing threads that have 3+ messages
 * but no thread_brief yet.
 *
 * Usage: npx tsx scripts/backfill-thread-briefs.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
  console.error("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

const MODEL = "claude-sonnet-4-6";

const THREAD_BRIEF_PROMPT = `You are summarizing a coaching thread from RevSignal, a DaaS sales command center.

Produce a structured brief that captures:
1. **Topic**: What this thread is about (deal, prospect, strategy, etc.)
2. **Key facts**: Names, companies, amounts, dates, decisions discussed
3. **Current status**: Where things stand as of the last message
4. **Open items**: Any unresolved questions or next steps

Keep it to 3-5 sentences. Be factual and specific. Do not invent details not in the thread.`;

async function run() {
  // Find threads with 3+ messages but no brief
  const { data: threads, error: threadErr } = await supabase
    .from("coaching_threads")
    .select("thread_id, title, user_id, message_count")
    .is("thread_brief", null)
    .gte("message_count", 3)
    .order("last_message_at", { ascending: false });

  if (threadErr) {
    console.error("Error fetching threads:", threadErr.message);
    process.exit(1);
  }

  if (!threads || threads.length === 0) {
    console.log("No threads need backfilling. All threads with 3+ messages already have briefs.");
    return;
  }

  console.log(`Found ${threads.length} threads to backfill.\n`);

  let success = 0;
  let failed = 0;

  for (const thread of threads) {
    console.log(`Processing: "${thread.title}" (${thread.message_count} messages)...`);

    // Fetch messages
    const { data: messages } = await supabase
      .from("coaching_conversations")
      .select("role, content, created_at, interaction_type")
      .eq("thread_id", thread.thread_id)
      .order("created_at", { ascending: true });

    if (!messages || messages.length < 3) {
      console.log("  Skipping (fewer than 3 messages in DB)");
      continue;
    }

    const INTEL_LABELS: Record<string, string> = {
      email: "EMAIL",
      conversation: "CONVERSATION",
      call_transcript: "CALL TRANSCRIPT",
      web_meeting: "WEB MEETING",
      in_person_meeting: "IN-PERSON MEETING",
    };

    const threadText = messages
      .map((m) => {
        const iType = m.interaction_type ?? "coaching";
        const intelLabel = INTEL_LABELS[iType];
        const role = m.role === "assistant"
          ? "STRATEGIST"
          : intelLabel
            ? `TINA (pasted ${intelLabel})`
            : "TINA";
        let content = m.content.replace(/<!-- FOLLOW_UPS\n[\s\S]*?-->/g, "").trim();
        if (content.length > 1000) {
          content = content.slice(0, 1000) + " [...]";
        }
        return `[${m.created_at.split("T")[0]}] ${role}: ${content}`;
      })
      .join("\n\n");

    const cappedText = threadText.length > 30000
      ? threadText.slice(0, 30000) + "\n\n[... earlier messages truncated ...]"
      : threadText;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: THREAD_BRIEF_PROMPT,
        messages: [
          { role: "user", content: `Summarize this coaching thread into a structured brief:\n\n${cappedText}` },
        ],
      });

      const briefText = response.content[0]?.type === "text" ? response.content[0].text : null;

      if (briefText) {
        await supabase
          .from("coaching_threads")
          .update({
            thread_brief: briefText,
            brief_updated_at: new Date().toISOString(),
          })
          .eq("thread_id", thread.thread_id)
          .eq("user_id", thread.user_id);

        console.log(`  Done (${briefText.length} chars)`);
        success++;
      } else {
        console.log("  Skipped (no brief generated)");
        failed++;
      }
    } catch (err) {
      console.error(`  Failed:`, err instanceof Error ? err.message : err);
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nBackfill complete: ${success} succeeded, ${failed} failed out of ${threads.length} total.`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
