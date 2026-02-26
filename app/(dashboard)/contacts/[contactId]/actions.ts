"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// --- Zod Schemas ---

const updateContactSchema = z.object({
  company: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  icp_category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const logConversationSchema = z.object({
  contact_id: z.string().min(1, "Contact ID is required"),
  deal_id: z.string().optional(),
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

// --- Server Actions ---

export async function updateContact(
  contactId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = updateContactSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function logConversation(
  formData: FormData
): Promise<{ conversation_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    contact_id: formData.get("contact_id"),
    deal_id: formData.get("deal_id") || undefined,
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
      contact_id: parsed.data.contact_id,
      deal_id: parsed.data.deal_id ?? null,
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

  // Update the deal's last_activity_date if linked to a deal
  if (parsed.data.deal_id) {
    await supabase
      .from("deals")
      .update({ last_activity_date: now, updated_at: now })
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id);
  }

  // If next step provided, create an action item
  const nextStep = formData.get("next_step") as string | null;
  if (nextStep && nextStep.trim()) {
    const nextStepDue = (formData.get("next_step_due") as string) || null;
    await supabase.from("action_items").insert({
      user_id: user.id,
      contact_id: parsed.data.contact_id,
      deal_id: parsed.data.deal_id ?? null,
      description: nextStep.trim(),
      owner:
        (formData.get("next_step_owner") as string) === "them" ? "them" : "me",
      due_date: nextStepDue || parsed.data.follow_up_date || null,
      status: "pending",
      escalation_level: "green",
      source_conversation_id: data.conversation_id,
    });
  }

  revalidatePath(`/contacts/${parsed.data.contact_id}`);
  if (parsed.data.deal_id) {
    revalidatePath(`/deals/${parsed.data.deal_id}`);
  }
  return { conversation_id: data.conversation_id };
}
