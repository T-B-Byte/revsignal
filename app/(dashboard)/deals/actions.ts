"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStage } from "@/types/database";

// --- Zod Schemas ---

const createDealSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  acv: z.coerce.number().nonnegative().optional(),
  stage: z.enum([
    "conversation",
    "lead",
    "qualified",
    "discovery",
    "poc_trial",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ] as const).optional(),
  deployment_method: z
    .enum([
      "api",
      "flat_file",
      "cloud_delivery",
      "platform_integration",
      "embedded_oem",
    ] as const)
    .optional(),
  product_tier: z.enum(["signals", "intelligence", "embedded"] as const).optional(),
  win_probability: z.coerce.number().min(0).max(100).optional(),
  close_date: z.string().optional(),
  notes: z.string().optional(),
});

const updateDealSchema = z.object({
  company: z.string().min(1).optional(),
  acv: z.number().nonnegative().nullable().optional(),
  stage: z
    .enum([
      "conversation",
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
  lost_reason: z.string().nullable().optional(),
});

// --- Server Actions ---

export async function createDeal(
  formData: FormData
): Promise<{ deal_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    company: formData.get("company"),
    acv: formData.get("acv") || undefined,
    stage: formData.get("stage") || undefined,
    deployment_method: formData.get("deployment_method") || undefined,
    product_tier: formData.get("product_tier") || undefined,
    win_probability: formData.get("win_probability") || undefined,
    close_date: formData.get("close_date") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = createDealSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      user_id: user.id,
      company: parsed.data.company,
      acv: parsed.data.acv ?? null,
      stage: parsed.data.stage ?? "lead",
      deployment_method: parsed.data.deployment_method ?? null,
      product_tier: parsed.data.product_tier ?? null,
      win_probability: parsed.data.win_probability ?? 10,
      close_date: parsed.data.close_date ?? null,
      notes: parsed.data.notes ?? null,
      contacts: [],
      created_date: now,
      last_activity_date: now,
    })
    .select("deal_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deals");
  return { deal_id: data.deal_id };
}

export async function updateDeal(
  dealId: string,
  data: Partial<Deal>
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = updateDealSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error } = await supabase
    .from("deals")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("deal_id", dealId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDeal(
  dealId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("deal_id", dealId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deals");
  return { success: true };
}

const dealStageSchema = z.enum([
  "conversation",
  "lead",
  "qualified",
  "discovery",
  "poc_trial",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const);

export async function updateDealStage(
  dealId: string,
  stage: DealStage
): Promise<{ success: boolean } | { error: string }> {
  const parsedStage = dealStageSchema.safeParse(stage);
  if (!parsedStage.success) return { error: "Invalid stage" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    stage: parsedStage.data,
    last_activity_date: now,
    updated_at: now,
  };

  // Set or clear closed_date based on stage
  if (stage === "closed_won" || stage === "closed_lost") {
    updateData.closed_date = now;
  } else {
    updateData.closed_date = null;
  }

  const { error } = await supabase
    .from("deals")
    .update(updateData)
    .eq("deal_id", dealId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
