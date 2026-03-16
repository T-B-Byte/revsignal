"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const createProspectSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  icp_category: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  estimated_acv: z.coerce.number().nonnegative().optional(),
  research_notes: z.string().optional(),
  why_they_buy: z.string().optional(),
  source: z.string().optional(),
});

export async function createProspect(
  formData: FormData
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    company: formData.get("company"),
    icp_category: formData.get("icp_category") || undefined,
    website: formData.get("website") || undefined,
    estimated_acv: formData.get("estimated_acv") || undefined,
    research_notes: formData.get("research_notes") || undefined,
    why_they_buy: formData.get("why_they_buy") || undefined,
    source: formData.get("source") || "manual",
  };

  const parsed = createProspectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      user_id: user.id,
      company: parsed.data.company,
      icp_category: parsed.data.icp_category ?? null,
      website: parsed.data.website || null,
      estimated_acv: parsed.data.estimated_acv ?? null,
      research_notes: parsed.data.research_notes ?? null,
      why_they_buy: parsed.data.why_they_buy ?? null,
      source: parsed.data.source ?? "manual",
      contacts: [],
      last_researched_date: now,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { id: data.id };
}

const updateProspectSchema = z.object({
  company: z.string().min(1).optional(),
  icp_category: z.string().optional().nullable(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  estimated_acv: z.coerce.number().nonnegative().optional().nullable(),
  research_notes: z.string().optional().nullable(),
  why_they_buy: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  fit_score: z.enum(["strong", "moderate", "weak", "not_a_fit"]).optional().nullable(),
  fit_analysis: z.string().optional().nullable(),
  suggested_contacts: z.array(z.object({
    title: z.string(),
    why_they_care: z.string(),
    approach: z.string(),
  })).optional().nullable(),
  next_action: z.string().optional().nullable(),
  status: z.enum(["active", "passed", "converted"]).optional(),
});

export async function updateProspect(
  prospectId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = updateProspectSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) clean[key] = value;
  }

  if (Object.keys(clean).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("prospects")
    .update(clean)
    .eq("id", prospectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function deleteProspect(
  prospectId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", prospectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}
