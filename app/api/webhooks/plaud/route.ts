import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature, getTranscript, getSummary } from "@/lib/integrations/plaud";
import { analyzeTranscript } from "@/lib/agents/call-analyst";

/**
 * POST /api/webhooks/plaud
 *
 * Receives webhook events from Plaud when recordings are processed.
 * Primary event: audio_transcribe.completed
 *
 * Flow:
 *  1. Verify webhook signature
 *  2. Fetch full transcript + summary from Plaud API
 *  3. Store as ingested message
 *  4. Run through Call Analyst for structured extraction
 *  5. Create conversation record and action items
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-plaud-signature") ?? "";

  // Verify webhook authenticity
  const event = await verifyWebhookSignature(body, signature);
  if (!event) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Acknowledge receipt immediately — process async
  // For now, process synchronously but keep it idempotent
  const fileId = event.data.fileId;

  if (event.eventType === "audio_transcribe.completed") {
    try {
      // Check for duplicate processing (idempotency)
      const { data: existing } = await supabase
        .from("ingested_messages")
        .select("id")
        .eq("source", "plaud")
        .eq("external_id", fileId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ received: true, status: "already_processed" });
      }

      // Find the user associated with this Plaud connection.
      // Query all users with Plaud tokens and warn if ambiguous.
      const { data: tokenRows } = await supabase
        .from("integration_tokens")
        .select("user_id")
        .eq("provider", "plaud");

      if (!tokenRows || tokenRows.length === 0) {
        console.error("[webhook/plaud] No Plaud connection found for incoming webhook");
        return NextResponse.json(
          { error: "No connected user found" },
          { status: 422 }
        );
      }

      if (tokenRows.length > 1) {
        console.warn(
          `[webhook/plaud] Multiple Plaud connections found (${tokenRows.length} users). ` +
          "Using first match. Configure per-user webhook URLs to resolve ambiguity."
        );
      }

      const userId = tokenRows[0].user_id;

      // Fetch transcript and summary from Plaud API
      const [transcriptResult, summaryResult] = await Promise.all([
        getTranscript(supabase, userId, fileId),
        getSummary(supabase, userId, fileId),
      ]);

      // Store raw ingested message
      await supabase.from("ingested_messages").insert({
        user_id: userId,
        source: "plaud",
        external_id: fileId,
        raw_content: transcriptResult.source === "plaud" && transcriptResult.data
          ? transcriptResult.data.rawText
          : null,
        processed: false,
      });

      // If we got a transcript, run it through Call Analyst
      if (transcriptResult.source === "plaud" && transcriptResult.data) {
        const transcript = transcriptResult.data;

        const analysis = await analyzeTranscript(
          supabase,
          userId,
          transcript.rawText,
          {
            date: transcript.createdAt,
            channel: "call",
            contactName: transcript.title ?? undefined,
          }
        );

        // Create conversation record
        const { data: conversation } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            date: transcript.createdAt,
            channel: "in_person" as const,
            subject: transcript.title,
            raw_text: transcript.rawText,
            ai_summary: analysis?.summary ?? (
              summaryResult.source === "plaud" && summaryResult.data
                ? summaryResult.data.summary
                : null
            ),
            action_items: analysis?.actionItems.map((a) => ({
              description: a.description,
              owner: a.owner,
              due_date: a.dueDate,
            })) ?? [],
            external_id: fileId,
          })
          .select("conversation_id")
          .single();

        // Create action items from analysis
        if (analysis && conversation) {
          const actionItemRows = analysis.actionItems
            .filter((a) => a.description)
            .map((a) => ({
              user_id: userId,
              description: a.description,
              owner: a.owner,
              due_date: a.dueDate,
              status: "pending" as const,
              source_conversation_id: conversation.conversation_id,
              escalation_level: "green" as const,
            }));

          if (actionItemRows.length > 0) {
            await supabase.from("action_items").insert(actionItemRows);
          }
        }

        // Mark ingested message as processed
        await supabase
          .from("ingested_messages")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("source", "plaud")
          .eq("external_id", fileId);

        // Log agent activity
        await supabase.from("agent_logs").insert({
          user_id: userId,
          agent_name: "call-analyst",
          action: "plaud_transcript_processed",
          input_context: {
            fileId,
            duration: transcript.duration,
            segments: transcript.transcript.length,
          },
          output: analysis?.summary ?? "No analysis generated",
          sources_cited: [`plaud:${fileId}`],
          tokens_used: analysis?.tokensUsed ?? null,
        });
      }

      return NextResponse.json({ received: true, status: "processed" });
    } catch (error) {
      console.error(
        "[webhook/plaud] Processing error:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json(
        { error: "Processing failed" },
        { status: 500 }
      );
    }
  }

  // Acknowledge unhandled event types without error
  return NextResponse.json({ received: true, status: "ignored" });
}
