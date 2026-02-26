"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionStatus, EscalationLevel } from "@/types/database";

// --- Zod Schemas ---

const logConversationSchema = z.object({
  deal_id: z.string().min(1, "Deal ID is required"),
  contact_id: z.string().optional(),
  channel: z.enum([
    "teams",
    "email",
    "call",
    "linkedin",
    "in_person",
    "manual",
  ] as const),
  subject: z.string().optional(),
  raw_text: z.string().min(1, "Conversation content is required"),
  follow_up_date: z.string().optional(),
});

const createActionItemSchema = z.object({
  deal_id: z.string().optional(),
  contact_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  owner: z.enum(["me", "them"] as const),
  due_date: z.string().optional(),
  source_conversation_id: z.string().optional(),
});

const updateActionItemSchema = z.object({
  status: z
    .enum(["pending", "completed", "overdue", "cancelled"] as const)
    .optional(),
  escalation_level: z.enum(["green", "yellow", "red"] as const).optional(),
});

// --- Server Actions ---

export async function logConversation(
  formData: FormData
): Promise<{ conversation_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    deal_id: formData.get("deal_id"),
    contact_id: formData.get("contact_id") || undefined,
    channel: formData.get("channel"),
    subject: formData.get("subject") || undefined,
    raw_text: formData.get("raw_text"),
    follow_up_date: formData.get("follow_up_date") || undefined,
  };

  const parsed = logConversationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      deal_id: parsed.data.deal_id,
      contact_id: parsed.data.contact_id ?? null,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      raw_text: parsed.data.raw_text,
      follow_up_date: parsed.data.follow_up_date ?? null,
      date: now,
      action_items: [],
    })
    .select("conversation_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update the deal's last_activity_date
  await supabase
    .from("deals")
    .update({ last_activity_date: now, updated_at: now })
    .eq("deal_id", parsed.data.deal_id)
    .eq("user_id", user.id);

  // If next step provided, create an action item
  const nextStep = formData.get("next_step") as string | null;
  if (nextStep && nextStep.trim()) {
    const nextStepDue = (formData.get("next_step_due") as string) || null;
    await supabase.from("action_items").insert({
      user_id: user.id,
      deal_id: parsed.data.deal_id,
      description: nextStep.trim(),
      owner: (formData.get("next_step_owner") as string) === "them" ? "them" : "me",
      due_date: nextStepDue || parsed.data.follow_up_date || null,
      status: "pending",
      escalation_level: "green",
      source_conversation_id: data.conversation_id,
    });
  }

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  revalidatePath("/deals");
  return { conversation_id: data.conversation_id };
}

export async function createActionItem(
  formData: FormData
): Promise<{ item_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    deal_id: formData.get("deal_id") || undefined,
    contact_id: formData.get("contact_id") || undefined,
    description: formData.get("description"),
    owner: formData.get("owner"),
    due_date: formData.get("due_date") || undefined,
    source_conversation_id: formData.get("source_conversation_id") || undefined,
  };

  const parsed = createActionItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("action_items")
    .insert({
      user_id: user.id,
      deal_id: parsed.data.deal_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
      description: parsed.data.description,
      owner: parsed.data.owner,
      due_date: parsed.data.due_date ?? null,
      status: "pending",
      escalation_level: "green",
      source_conversation_id: parsed.data.source_conversation_id ?? null,
    })
    .select("item_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (parsed.data.deal_id) {
    revalidatePath(`/deals/${parsed.data.deal_id}`);
  }
  return { item_id: data.item_id };
}

export async function updateActionItem(
  itemId: string,
  data: { status?: ActionStatus; escalation_level?: EscalationLevel },
  dealId?: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = updateActionItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Set completed_at when marking as completed
  if (parsed.data.status === "completed") {
    updateData.completed_at = new Date().toISOString();
  } else if (parsed.data.status === "pending") {
    updateData.completed_at = null;
  }

  const { error } = await supabase
    .from("action_items")
    .update(updateData)
    .eq("item_id", itemId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deals");
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
  }
  return { success: true };
}
