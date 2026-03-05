"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TradeshowTarget } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Promote a tradeshow target to a prospect.
 * Creates a new row in the prospects table from target data.
 */
export async function promoteToProspect(
  targetId: string
): Promise<{ id: string } | { error: string }> {
  if (!UUID_REGEX.test(targetId)) return { error: "Invalid target" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the target (scoped to user)
  const { data: target, error: targetError } = await supabase
    .from("tradeshow_targets")
    .select("*")
    .eq("target_id", targetId)
    .eq("user_id", user.id)
    .single();

  if (targetError || !target) {
    return { error: "Target not found" };
  }

  const t = target as TradeshowTarget;

  // Fetch the tradeshow name for source attribution
  const { data: tradeshow } = await supabase
    .from("tradeshows")
    .select("name")
    .eq("tradeshow_id", t.tradeshow_id)
    .eq("user_id", user.id)
    .single();

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      user_id: user.id,
      company: t.company,
      icp_category: t.icp_category ?? null,
      estimated_acv: t.estimated_acv ?? null,
      research_notes: [
        t.company_description,
        t.pitch_angle ? `Pitch angle: ${t.pitch_angle}` : null,
        t.bombora_angle ? `Bombora angle: ${t.bombora_angle}` : null,
        t.priority_rationale ? `Priority: ${t.priority_rationale}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      why_they_buy: t.pitch_angle ?? null,
      source: `tradeshow:${tradeshow?.name ?? "unknown"}`,
      contacts: [],
      last_researched_date: now,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[tradeshows/actions] DB error:", error.message);
    return { error: "Failed to complete this action. Please try again." };
  }

  // Link the prospect back to the target
  await supabase
    .from("tradeshow_targets")
    .update({ existing_prospect_id: data.id })
    .eq("target_id", targetId)
    .eq("user_id", user.id);

  revalidatePath("/prospects");
  revalidatePath("/tradeshows");
  return { id: data.id };
}

/**
 * Promote a tradeshow target to a deal in "lead" stage.
 */
export async function promoteToDeal(
  targetId: string
): Promise<{ dealId: string } | { error: string }> {
  if (!UUID_REGEX.test(targetId)) return { error: "Invalid target" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the target (scoped to user)
  const { data: target, error: targetError } = await supabase
    .from("tradeshow_targets")
    .select("*")
    .eq("target_id", targetId)
    .eq("user_id", user.id)
    .single();

  if (targetError || !target) {
    return { error: "Target not found" };
  }

  const t = target as TradeshowTarget;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("deals")
    .insert({
      user_id: user.id,
      company: t.company,
      stage: "lead",
      acv: t.estimated_acv ?? null,
      contacts: [],
      win_probability: 10,
      notes: [
        t.company_description,
        t.pitch_angle ? `Pitch angle: ${t.pitch_angle}` : null,
        t.bombora_angle ? `Bombora angle: ${t.bombora_angle}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      created_date: now,
      last_activity_date: now,
    })
    .select("deal_id")
    .single();

  if (error) {
    console.error("[tradeshows/actions] DB error:", error.message);
    return { error: "Failed to complete this action. Please try again." };
  }

  // Link the deal back to the target
  await supabase
    .from("tradeshow_targets")
    .update({ existing_deal_id: data.deal_id })
    .eq("target_id", targetId)
    .eq("user_id", user.id);

  revalidatePath("/deals");
  revalidatePath("/tradeshows");
  return { dealId: data.deal_id };
}

/**
 * Delete a tradeshow and all its targets/contacts (cascading).
 */
export async function deleteTradeshowAction(
  tradeshowId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(tradeshowId)) return { error: "Invalid tradeshow" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tradeshows")
    .delete()
    .eq("tradeshow_id", tradeshowId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[tradeshows/actions] DB error:", error.message);
    return { error: "Failed to complete this action. Please try again." };
  }

  revalidatePath("/tradeshows");
  return { success: true };
}
