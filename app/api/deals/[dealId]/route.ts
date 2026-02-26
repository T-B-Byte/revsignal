import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updateDealBodySchema = z.object({
  company: z.string().min(1).optional(),
  acv: z.number().nonnegative().nullable().optional(),
  stage: z
    .enum([
      "lead",
      "qualified",
      "discovery",
      "poc_trial",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ] as const)
    .optional(),
  deployment_method: z
    .enum([
      "api",
      "flat_file",
      "cloud_delivery",
      "platform_integration",
      "embedded_oem",
    ] as const)
    .nullable()
    .optional(),
  product_tier: z
    .enum(["signals", "intelligence", "embedded"] as const)
    .nullable()
    .optional(),
  win_probability: z.number().min(0).max(100).optional(),
  close_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contacts: z
    .array(
      z.object({
        contact_id: z.string(),
        name: z.string(),
        role: z.string().optional(),
      })
    )
    .optional(),
  lost_reason: z.string().nullable().optional(),
});

interface RouteContext {
  params: Promise<{ dealId: string }>;
}

/**
 * GET /api/deals/[dealId]
 * Get a single deal with conversations and action items
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { dealId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  // Fetch action items
  const { data: actionItems } = await supabase
    .from("action_items")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch deal brief
  const { data: dealBrief } = await supabase
    .from("deal_briefs")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    deal,
    conversations: conversations ?? [],
    action_items: actionItems ?? [],
    deal_brief: dealBrief ?? null,
  });
}

/**
 * PATCH /api/deals/[dealId]
 * Update a deal
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { dealId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateDealBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: now,
  };

  // Set or clear closed_date based on stage
  if (
    parsed.data.stage === "closed_won" ||
    parsed.data.stage === "closed_lost"
  ) {
    updateData.closed_date = now;
  } else if (parsed.data.stage) {
    updateData.closed_date = null;
  }

  const { data, error } = await supabase
    .from("deals")
    .update(updateData)
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ deal: data });
}

/**
 * DELETE /api/deals/[dealId]
 * Delete a deal
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { dealId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("deal_id", dealId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
