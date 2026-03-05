import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MeetingNoteEditor } from "@/components/meetings/meeting-note-editor";
import type { MeetingNote } from "@/types/database";

interface EditMeetingPageProps {
  params: Promise<{ noteId: string }>;
}

export default async function EditMeetingPage({ params }: EditMeetingPageProps) {
  const supabase = await createClient();
  const { noteId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [noteResult, dealsResult] = await Promise.all([
    supabase
      .from("meeting_notes")
      .select("*")
      .eq("note_id", noteId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("deals")
      .select("deal_id, company")
      .eq("user_id", user.id)
      .order("company"),
  ]);

  if (!noteResult.data) {
    notFound();
  }

  const note = noteResult.data as MeetingNote;
  const deals =
    (dealsResult.data as { deal_id: string; company: string }[]) ?? [];

  return <MeetingNoteEditor note={note} deals={deals} />;
}
