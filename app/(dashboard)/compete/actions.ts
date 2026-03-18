"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CompetitorComparison } from "@/types/database";

const addIntelSchema = z.object({
  competitor: z.string().min(1, "Competitor name is required"),
  category: z.string().min(1, "Category is required"),
  data_point: z.string().min(1, "Data point is required"),
  source: z.string().optional(),
});

export async function addCompetitiveIntel(
  formData: FormData
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    competitor: formData.get("competitor"),
    category: formData.get("category"),
    data_point: formData.get("data_point"),
    source: formData.get("source") || undefined,
  };

  const parsed = addIntelSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("competitive_intel")
    .insert({
      user_id: user.id,
      competitor: parsed.data.competitor,
      category: parsed.data.category,
      data_point: parsed.data.data_point,
      source: parsed.data.source ?? null,
      captured_date: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/compete");
  return { id: data.id };
}

export async function deleteCompetitiveIntel(
  intelId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("competitive_intel")
    .delete()
    .eq("id", intelId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/compete");
  return { success: true };
}

// --- Competitor Comparison Actions ---

const comparisonSchema = z.object({
  competitor: z.string().min(1).max(100),
  pricing: z.string().max(500).optional(),
  revenue: z.string().max(500).optional(),
  valuation: z.string().max(500).optional(),
  weakness: z.string().max(500).optional(),
});

export async function upsertComparison(
  data: { id?: string; competitor: string; pricing?: string; revenue?: string; valuation?: string; weakness?: string }
): Promise<{ comparison: CompetitorComparison } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = comparisonSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const row = {
    user_id: user.id,
    competitor: parsed.data.competitor,
    pricing: parsed.data.pricing ?? null,
    revenue: parsed.data.revenue ?? null,
    valuation: parsed.data.valuation ?? null,
    weakness: parsed.data.weakness ?? null,
  };

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("competitor_comparisons")
      .update(row)
      .eq("id", data.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { error: error.message };
    revalidatePath("/compete");
    return { comparison: updated as CompetitorComparison };
  }

  // Get max sort_order for new rows
  const { data: maxRow } = await supabase
    .from("competitor_comparisons")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("competitor_comparisons")
    .insert({ ...row, sort_order: (maxRow?.sort_order ?? -1) + 1 })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/compete");
  return { comparison: inserted as CompetitorComparison };
}

export async function deleteComparison(
  comparisonId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("competitor_comparisons")
    .delete()
    .eq("id", comparisonId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/compete");
  return { success: true };
}
