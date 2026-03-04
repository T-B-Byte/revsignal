"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MeetingAttendee } from "@/types/database";

const meetingTypeEnum = z.enum([
  "one_on_one",
  "team",
  "strategy",
  "cross_functional",
  "board",
  "standup",
  "other",
] as const);

const createMeetingNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meeting_date: z.string().min(1, "Meeting date is required"),
  meeting_type: meetingTypeEnum,
  attendees_json: z.string(),
  content: z.string().min(1, "Meeting notes are required"),
  tags: z.string().optional(),
  deal_id: z.string().optional(),
});

const updateMeetingNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meeting_date: z.string().min(1, "Meeting date is required"),
  meeting_type: meetingTypeEnum,
  attendees_json: z.string(),
  content: z.string().min(1, "Meeting notes are required"),
  tags: z.string().optional(),
  deal_id: z.string().optional(),
});

const MAX_ATTENDEE_NAME = 200;
const MAX_ATTENDEE_ROLE = 100;
const MAX_ATTENDEES = 30;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;

/** Zod schema for validating parsed attendees (prevents JSONB injection). */
const attendeeSchema = z.array(
  z.object({
    name: z.string().min(1).max(MAX_ATTENDEE_NAME),
    role: z.string().max(MAX_ATTENDEE_ROLE).optional(),
  })
).max(MAX_ATTENDEES);

/**
 * Parse "Jeff Rokuskie (CEO), Ben Luck (Chief Data Scientist)" into
 * [{name: "Jeff Rokuskie", role: "CEO"}, {name: "Ben Luck", role: "Chief Data Scientist"}]
 */
function parseAttendees(input: string): MeetingAttendee[] {
  if (!input.trim()) return [];
  return input
    .split(",")
    .map((s) => {
      const match = s.trim().match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (match) {
        return {
          name: match[1].trim().slice(0, MAX_ATTENDEE_NAME),
          role: match[2].trim().slice(0, MAX_ATTENDEE_ROLE),
        };
      }
      return { name: s.trim().slice(0, MAX_ATTENDEE_NAME) };
    })
    .filter((a) => a.name.length > 0)
    .slice(0, MAX_ATTENDEES);
}

export async function createMeetingNote(
  formData: FormData
): Promise<{ note_id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    title: formData.get("title"),
    meeting_date: formData.get("meeting_date"),
    meeting_type: formData.get("meeting_type") || "other",
    attendees_json: formData.get("attendees_json") || "[]",
    content: formData.get("content"),
    tags: formData.get("tags") || undefined,
    deal_id: formData.get("deal_id") || undefined,
  };

  const parsed = createMeetingNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  // Parse attendees — accept either JSON array or comma-separated string
  let attendees: MeetingAttendee[];
  try {
    const json = JSON.parse(parsed.data.attendees_json);
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === "object") {
      attendees = json;
    } else {
      attendees = parseAttendees(parsed.data.attendees_json);
    }
  } catch {
    attendees = parseAttendees(parsed.data.attendees_json);
  }

  // Validate attendee structure (prevents JSONB injection)
  const attendeeParsed = attendeeSchema.safeParse(attendees);
  if (!attendeeParsed.success) {
    return { error: "Invalid attendee data. Check names and roles." };
  }
  attendees = attendeeParsed.data;

  const tags = parsed.data.tags
    ? parsed.data.tags
        .split(",")
        .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : [];

  // Verify user owns the linked deal (prevents unauthorized deal linking)
  const dealId = parsed.data.deal_id || null;
  if (dealId) {
    const { data: dealCheck } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .single();
    if (!dealCheck) return { error: "Invalid deal selection." };
  }

  const { data, error } = await supabase
    .from("meeting_notes")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      meeting_date: parsed.data.meeting_date,
      meeting_type: parsed.data.meeting_type,
      attendees,
      content: parsed.data.content,
      tags,
      deal_id: dealId,
      action_items: [],
    })
    .select("note_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  return { note_id: data.note_id };
}

export async function updateMeetingNote(
  noteId: string,
  formData: FormData
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    title: formData.get("title"),
    meeting_date: formData.get("meeting_date"),
    meeting_type: formData.get("meeting_type") || "other",
    attendees_json: formData.get("attendees_json") || "[]",
    content: formData.get("content"),
    tags: formData.get("tags") || undefined,
    deal_id: formData.get("deal_id") || undefined,
  };

  const parsed = updateMeetingNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  let attendees: MeetingAttendee[];
  try {
    const json = JSON.parse(parsed.data.attendees_json);
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === "object") {
      attendees = json;
    } else {
      attendees = parseAttendees(parsed.data.attendees_json);
    }
  } catch {
    attendees = parseAttendees(parsed.data.attendees_json);
  }

  // Validate attendee structure (prevents JSONB injection)
  const attendeeParsed = attendeeSchema.safeParse(attendees);
  if (!attendeeParsed.success) {
    return { error: "Invalid attendee data. Check names and roles." };
  }
  attendees = attendeeParsed.data;

  const tags = parsed.data.tags
    ? parsed.data.tags
        .split(",")
        .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : [];

  // Verify user owns the linked deal (prevents unauthorized deal linking)
  const dealId = parsed.data.deal_id || null;
  if (dealId) {
    const { data: dealCheck } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .single();
    if (!dealCheck) return { error: "Invalid deal selection." };
  }

  const { error } = await supabase
    .from("meeting_notes")
    .update({
      title: parsed.data.title,
      meeting_date: parsed.data.meeting_date,
      meeting_type: parsed.data.meeting_type,
      attendees,
      content: parsed.data.content,
      tags,
      deal_id: dealId,
    })
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  return { success: true };
}

export async function deleteMeetingNote(
  noteId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("meeting_notes")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  return { success: true };
}
