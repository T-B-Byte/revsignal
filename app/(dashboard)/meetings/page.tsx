import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { MeetingsView } from "@/components/meetings/meetings-view";
import type { MeetingNote, SubscriptionTier } from "@/types/database";

export const metadata = {
  title: "Meetings | RevSignal",
  description: "Internal meeting notes and strategy discussions.",
};

export default async function MeetingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [notesResult, dealsResult, subscriptionResult] = await Promise.all([
    supabase
      .from("meeting_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("meeting_date", { ascending: false }),
    supabase
      .from("deals")
      .select("deal_id, company")
      .eq("user_id", user.id)
      .order("company"),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const tier: SubscriptionTier = subscriptionResult.data?.tier ?? "free";
  const hasAiAccess = PLANS[tier].limits.aiBriefings;

  const notes = (notesResult.data as MeetingNote[]) ?? [];
  const deals =
    (dealsResult.data as { deal_id: string; company: string }[]) ?? [];

  // Extract unique tags for filtering
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  // Extract unique attendee names for filtering
  const allAttendees = Array.from(
    new Set(notes.flatMap((n) => n.attendees.map((a) => a.name)))
  ).sort();

  return (
    <MeetingsView
      notes={notes}
      deals={deals}
      allTags={allTags}
      allAttendees={allAttendees}
      hasAiAccess={hasAiAccess}
    />
  );
}
