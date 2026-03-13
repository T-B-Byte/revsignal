import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MeetingsView } from "@/components/meetings/meetings-view";
import type { MeetingNote } from "@/types/database";

export const metadata = {
  title: "Meetings | RevSignal",
  description: "Meeting prep and command center.",
};

export default async function MeetingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meetings } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("meeting_date", { ascending: true });

  // Fetch deals for linking meetings to deals
  const { data: deals } = await supabase
    .from("deals")
    .select("deal_id, company")
    .eq("user_id", user.id)
    .order("company", { ascending: true });

  return (
    <MeetingsView
      meetings={(meetings as MeetingNote[]) ?? []}
      deals={(deals as { deal_id: string; company: string }[]) ?? []}
    />
  );
}
