"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// --- Zod Schemas ---

const workflowStepSchema = z.object({
  step_number: z.number().int().positive(),
  description: z.string().min(1, "Step description is required"),
});

const createUseCaseSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required").max(200),
  deal_id: z.string().uuid().nullable().optional(),
  delivery_method: z
    .enum(["api", "flat_file", "sftp", "cloud_delivery"] as const)
    .nullable()
    .optional(),
  access_tier: z
    .enum(["display_only", "crm_append", "bulk_export"] as const)
    .nullable()
    .optional(),
  licensed_fields: z.array(z.string().max(100)).max(50).default([]),
  permitted_workflows: z.array(workflowStepSchema).max(50).default([]),
  caching_permitted: z.boolean().default(false),
  cache_ttl_days: z.number().int().positive().nullable().optional(),
  end_user_access: z.boolean().default(false),
  end_user_can_export: z.boolean().default(false),
  anti_competitive_clause: z.boolean().default(true),
  custom_restrictions: z.string().max(5000).nullable().optional(),
  volume_annual_minimum: z.number().int().nonnegative().nullable().optional(),
  volume_monthly_queries: z.number().int().nonnegative().nullable().optional(),
  overage_model: z
    .enum(["per_query", "hard_shutoff"] as const)
    .nullable()
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const updateUseCaseSchema = createUseCaseSchema.partial().extend({
  status: z
    .enum(["draft", "review", "final", "attached"] as const)
    .optional(),
});

// --- Server Actions ---

export async function createUseCase(
  data: z.input<typeof createUseCaseSchema>
): Promise<{ use_case_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const parsed = createUseCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify deal ownership if deal_id is provided
  if (parsed.data.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id)
      .single();

    if (!deal) {
      return { error: "Deal not found" };
    }
  }

  const { data: row, error } = await supabase
    .from("daas_use_cases")
    .insert({
      user_id: user.id,
      ...parsed.data,
    })
    .select("use_case_id")
    .single();

  if (error) {
    return { error: "Failed to create use case" };
  }

  revalidatePath("/contracts");
  return { use_case_id: row.use_case_id };
}

export async function updateUseCase(
  useCaseId: string,
  data: z.input<typeof updateUseCaseSchema>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(useCaseId)) {
    return { error: "Invalid use case ID" };
  }

  const parsed = updateUseCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify deal ownership if deal_id is being set
  if (parsed.data.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id)
      .single();

    if (!deal) {
      return { error: "Deal not found" };
    }
  }

  const { error } = await supabase
    .from("daas_use_cases")
    .update(parsed.data)
    .eq("use_case_id", useCaseId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to update use case" };
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${useCaseId}`);
  return { success: true };
}

export async function deleteUseCase(
  useCaseId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(useCaseId)) {
    return { error: "Invalid use case ID" };
  }

  const { error } = await supabase
    .from("daas_use_cases")
    .delete()
    .eq("use_case_id", useCaseId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to delete use case" };
  }

  revalidatePath("/contracts");
  return { success: true };
}

export async function duplicateUseCase(
  useCaseId: string
): Promise<{ use_case_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(useCaseId)) {
    return { error: "Invalid use case ID" };
  }

  const { data: original, error: fetchError } = await supabase
    .from("daas_use_cases")
    .select("*")
    .eq("use_case_id", useCaseId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: "Use case not found" };
  }

  const {
    use_case_id: _id,
    created_at: _ca,
    updated_at: _ua,
    ...fields
  } = original;

  const { data: row, error } = await supabase
    .from("daas_use_cases")
    .insert({
      ...fields,
      customer_name: `${fields.customer_name} (Copy)`,
      status: "draft",
    })
    .select("use_case_id")
    .single();

  if (error) {
    return { error: "Failed to duplicate use case" };
  }

  revalidatePath("/contracts");
  return { use_case_id: row.use_case_id };
}
