"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
