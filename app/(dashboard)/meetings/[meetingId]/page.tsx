import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MeetingDetail } from "@/components/meetings/meeting-detail";
import type { MeetingNote, ContactAgendaItem, Deal, CoachingThread, CoachingMessage } from "@/types/database";

export const metadata = {
  title: "Meeting Prep | RevSignal",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch meeting
  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("note_id", meetingId)
    .eq("user_id", user.id)
    .single();

  if (!meeting) notFound();

  // Fetch contact agenda items for attendee contacts
  const contactIds: string[] = (meeting as MeetingNote).contact_ids ?? [];
  let contactAgendaItems: ContactAgendaItem[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabase
      .from("contact_agenda_items")
      .select("*")
      .eq("user_id", user.id)
      .in("contact_id", contactIds)
      .eq("status", "open");
    contactAgendaItems = (data ?? []) as ContactAgendaItem[];
  }

  // Fetch contacts for names
  let contacts: {
    contact_id: string;
    name: string;
    role: string | null;
    company: string;
  }[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("contact_id, name, role, company")
      .in("contact_id", contactIds);
    contacts = data ?? [];
  }

  // Fetch active deals for linking
  const { data: deals } = await supabase
    .from("deals")
    .select("deal_id, company, stage")
    .eq("user_id", user.id)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("company");

  // Fetch coaching thread linked to this meeting (if any)
  const { data: meetingThread } = await supabase
    .from("coaching_threads")
    .select("*")
    .eq("user_id", user.id)
    .eq("meeting_note_id", meetingId)
    .maybeSingle();

  // Fetch messages for the meeting thread
  let meetingThreadMessages: CoachingMessage[] = [];
  if (meetingThread) {
    const { data: msgs } = await supabase
      .from("coaching_conversations")
      .select("*")
      .eq("thread_id", meetingThread.thread_id)
      .order("created_at", { ascending: true })
      .limit(200);
    meetingThreadMessages = (msgs as CoachingMessage[]) ?? [];
  }

  return (
    <MeetingDetail
      meeting={meeting as MeetingNote}
      contactAgendaItems={contactAgendaItems}
      contacts={contacts}
      activeDeals={
        (deals ?? []) as Pick<Deal, "deal_id" | "company" | "stage">[]
      }
      thread={(meetingThread as CoachingThread) ?? null}
      threadMessages={meetingThreadMessages}
    />
  );
}
