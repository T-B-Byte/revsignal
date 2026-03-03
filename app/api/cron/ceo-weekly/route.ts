import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCeoWeekly } from "@/lib/agents/strategist";
import { buildCeoWeeklyEmail } from "@/lib/email-templates";
import { sendCeoWeeklyUpdate } from "@/lib/sendgrid";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/cron/ceo-weekly
 *
 * Cron job: Generates and sends the CEO weekly DaaS revenue update.
 * Scheduled Friday at 4:00 PM (runs after friday-memo so data is fresh).
 *
 * Recipient: CEO email from PHAROSIQ_CEO_EMAIL env var.
 * Sender: Tina's email (or RevSignal alerts address).
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ceoEmail = process.env.PHAROSIQ_CEO_EMAIL;
  if (!ceoEmail) {
    console.error("[cron/ceo-weekly] PHAROSIQ_CEO_EMAIL not configured");
    return NextResponse.json(
      { error: "CEO email not configured" },
      { status: 500 }
    );
  }

  const ceoName = process.env.PHAROSIQ_CEO_NAME ?? "Jeff";

  const supabase = createAdminClient();

  // Find the primary user (Tina) — the Power-tier user
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .eq("tier", "power")
    .limit(1);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: "No eligible user", processed: 0 });
  }

  const userId = subscriptions[0].user_id;

  try {
    // Generate CEO-safe weekly data
    const data = await generateCeoWeekly(supabase, userId);

    // Build email HTML
    const html = buildCeoWeeklyEmail({
      recipientName: ceoName,
      closedRevenue: data.closedRevenue,
      revenueTarget: data.revenueTarget,
      pipelineAcv: data.pipelineAcv,
      dealsAdvanced: data.dealsAdvanced,
      activeDeals: data.activeDeals,
      meetingsThisWeek: data.meetingsThisWeek,
      highlights: data.highlights,
      nextWeek: data.nextWeek,
    });

    // Send to CEO
    const sendResult = await sendCeoWeeklyUpdate(ceoEmail, html);

    if (!sendResult.success) {
      console.error("[cron/ceo-weekly] Send failed:", sendResult.error);
      return NextResponse.json(
        { error: "Email send failed" },
        { status: 500 }
      );
    }

    // Log the send
    await supabase.from("agent_logs").insert({
      user_id: userId,
      agent_name: "strategist",
      action: "ceo_weekly_sent",
      input_context: {
        recipient: ceoEmail,
        closedRevenue: data.closedRevenue,
        pipelineAcv: data.pipelineAcv,
      },
      output: `CEO weekly sent to ${ceoEmail}. Highlights: ${data.highlights.join("; ")}`,
      sources_cited: [],
      tokens_used: data.tokensUsed,
    });

    return NextResponse.json({
      message: `CEO weekly update sent to ${ceoEmail}`,
      data: {
        closedRevenue: data.closedRevenue,
        pipelineAcv: data.pipelineAcv,
        dealsAdvanced: data.dealsAdvanced,
        highlights: data.highlights,
      },
    });
  } catch (error) {
    console.error(
      "[cron/ceo-weekly] Failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
