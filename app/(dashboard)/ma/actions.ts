"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// --- Zod Schemas ---

const maStages = [
  "identified",
  "researching",
  "outreach",
  "conversations",
  "diligence",
  "negotiation",
  "closed",
  "passed",
  "dead",
] as const;

const createEntitySchema = z.object({
  company: z.string().min(1, "Company name is required").max(200),
  entity_type: z.enum(["acquirer", "target"] as const),
  stage: z.enum(maStages).optional(),
  strategic_rationale: z.string().max(5000).optional(),
  estimated_valuation: z.coerce.number().nonnegative().optional(),
  key_date: z.string().regex(DATE_REGEX, "Date must be YYYY-MM-DD").optional(),
  key_date_label: z.string().max(100).optional(),
  website: z.string().url("Invalid URL").max(500).optional(),
  notes: z.string().max(10000).optional(),
  source: z.string().max(200).optional(),
});

const updateEntitySchema = z.object({
  company: z.string().min(1).max(200).optional(),
  entity_type: z.enum(["acquirer", "target"] as const).optional(),
  stage: z.enum(maStages).optional(),
  strategic_rationale: z.string().max(5000).nullable().optional(),
  estimated_valuation: z.coerce.number().nonnegative().nullable().optional(),
  key_date: z.string().regex(DATE_REGEX, "Date must be YYYY-MM-DD").nullable().optional(),
  key_date_label: z.string().max(100).nullable().optional(),
  website: z.string().url("Invalid URL").max(500).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  source: z.string().max(200).nullable().optional(),
});

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  title: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional(),
  linkedin_url: z.string().url("Invalid URL").max(500).optional(),
  role_in_process: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

const createNoteSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  note_type: z.enum(["update", "meeting", "research", "document", "decision"] as const).optional(),
});

// --- Helper: verify entity ownership ---

async function verifyEntityOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("ma_entities")
    .select("entity_id")
    .eq("entity_id", entityId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// --- Entity Actions ---

export async function createMaEntity(
  formData: FormData
): Promise<{ entity_id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    company: formData.get("company"),
    entity_type: formData.get("entity_type"),
    stage: formData.get("stage") || undefined,
    strategic_rationale: formData.get("strategic_rationale") || undefined,
    estimated_valuation: formData.get("estimated_valuation") || undefined,
    key_date: formData.get("key_date") || undefined,
    key_date_label: formData.get("key_date_label") || undefined,
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
    source: formData.get("source") || undefined,
  };

  const parsed = createEntitySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("ma_entities")
    .insert({
      user_id: user.id,
      company: parsed.data.company,
      entity_type: parsed.data.entity_type,
      stage: parsed.data.stage ?? "identified",
      strategic_rationale: parsed.data.strategic_rationale ?? null,
      estimated_valuation: parsed.data.estimated_valuation ?? null,
      key_date: parsed.data.key_date ?? null,
      key_date_label: parsed.data.key_date_label ?? null,
      website: parsed.data.website ?? null,
      notes: parsed.data.notes ?? null,
      source: parsed.data.source ?? null,
    })
    .select("entity_id")
    .single();

  if (error) {
    console.error("[ma/actions] createMaEntity error:", error.message);
    return { error: "Failed to create entity. Please try again." };
  }

  revalidatePath("/ma");
  return { entity_id: data.entity_id };
}

export async function updateMaEntity(
  entityId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(entityId)) return { error: "Invalid entity ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = updateEntitySchema.safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error } = await supabase
    .from("ma_entities")
    .update(parsed.data)
    .eq("entity_id", entityId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] updateMaEntity error:", error.message);
    return { error: "Failed to update entity. Please try again." };
  }

  revalidatePath("/ma");
  revalidatePath(`/ma/${entityId}`);
  return { success: true };
}

export async function deleteMaEntity(
  entityId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(entityId)) return { error: "Invalid entity ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ma_entities")
    .delete()
    .eq("entity_id", entityId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] deleteMaEntity error:", error.message);
    return { error: "Failed to delete entity. Please try again." };
  }

  revalidatePath("/ma");
  return { success: true };
}

export async function updateMaStage(
  entityId: string,
  stage: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(entityId)) return { error: "Invalid entity ID" };

  const stageSchema = z.enum(maStages);
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return { error: "Invalid stage" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ma_entities")
    .update({ stage: parsed.data })
    .eq("entity_id", entityId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] updateMaStage error:", error.message);
    return { error: "Failed to update stage. Please try again." };
  }

  revalidatePath("/ma");
  revalidatePath(`/ma/${entityId}`);
  return { success: true };
}

// --- Contact Actions ---

export async function addMaContact(
  entityId: string,
  formData: FormData
): Promise<{ contact_id: string } | { error: string }> {
  if (!UUID_REGEX.test(entityId)) return { error: "Invalid entity ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify entity ownership (IDOR protection)
  const owns = await verifyEntityOwnership(supabase, entityId, user.id);
  if (!owns) return { error: "Entity not found" };

  const raw = {
    name: formData.get("name"),
    title: formData.get("title") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    linkedin_url: formData.get("linkedin_url") || undefined,
    role_in_process: formData.get("role_in_process") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = createContactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("ma_contacts")
    .insert({
      entity_id: entityId,
      user_id: user.id,
      name: parsed.data.name,
      title: parsed.data.title ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      linkedin_url: parsed.data.linkedin_url ?? null,
      role_in_process: parsed.data.role_in_process ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("contact_id")
    .single();

  if (error) {
    console.error("[ma/actions] addMaContact error:", error.message);
    return { error: "Failed to add contact. Please try again." };
  }

  revalidatePath(`/ma/${entityId}`);
  return { contact_id: data.contact_id };
}

export async function updateMaContact(
  contactId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(contactId)) return { error: "Invalid contact ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = createContactSchema.partial().safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  // Fetch the contact to get its entity_id for revalidation
  const { data: contact } = await supabase
    .from("ma_contacts")
    .select("entity_id")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("ma_contacts")
    .update(parsed.data)
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] updateMaContact error:", error.message);
    return { error: "Failed to update contact. Please try again." };
  }

  revalidatePath("/ma");
  if (contact?.entity_id) revalidatePath(`/ma/${contact.entity_id}`);
  return { success: true };
}

export async function deleteMaContact(
  contactId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(contactId)) return { error: "Invalid contact ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch entity_id before deleting for revalidation
  const { data: contact } = await supabase
    .from("ma_contacts")
    .select("entity_id")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("ma_contacts")
    .delete()
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] deleteMaContact error:", error.message);
    return { error: "Failed to delete contact. Please try again." };
  }

  revalidatePath("/ma");
  if (contact?.entity_id) revalidatePath(`/ma/${contact.entity_id}`);
  return { success: true };
}

// --- Note Actions ---

export async function addMaNote(
  entityId: string,
  formData: FormData
): Promise<{ note_id: string } | { error: string }> {
  if (!UUID_REGEX.test(entityId)) return { error: "Invalid entity ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify entity ownership (IDOR protection)
  const owns = await verifyEntityOwnership(supabase, entityId, user.id);
  if (!owns) return { error: "Entity not found" };

  const raw = {
    content: formData.get("content"),
    note_type: formData.get("note_type") || undefined,
  };

  const parsed = createNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("ma_notes")
    .insert({
      entity_id: entityId,
      user_id: user.id,
      content: parsed.data.content,
      note_type: parsed.data.note_type ?? "update",
    })
    .select("note_id")
    .single();

  if (error) {
    console.error("[ma/actions] addMaNote error:", error.message);
    return { error: "Failed to add note. Please try again." };
  }

  revalidatePath(`/ma/${entityId}`);
  return { note_id: data.note_id };
}

export async function deleteMaNote(
  noteId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(noteId)) return { error: "Invalid note ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ma_notes")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] deleteMaNote error:", error.message);
    return { error: "Failed to delete note. Please try again." };
  }

  revalidatePath("/ma");
  return { success: true };
}

// --- Document Actions ---

export async function deleteMaDocument(
  documentId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(documentId)) return { error: "Invalid document ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch document to get storage path and entity_id for cleanup
  const { data: doc } = await supabase
    .from("ma_documents")
    .select("storage_path, entity_id")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doc) return { error: "Document not found" };

  // Delete from storage
  await supabase.storage.from("ma-documents").remove([doc.storage_path]);

  // Delete record
  const { error } = await supabase
    .from("ma_documents")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ma/actions] deleteMaDocument error:", error.message);
    return { error: "Failed to delete document. Please try again." };
  }

  revalidatePath(`/ma/${doc.entity_id}`);
  return { success: true };
}
