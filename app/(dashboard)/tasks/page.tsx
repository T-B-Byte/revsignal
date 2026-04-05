import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TasksView } from "@/components/tasks/tasks-view";
import type { UserTaskWithDeal, Deal } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tasks | RevSignal",
  description: "All action items in one place.",
};

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [tasksRes, dealsRes] = await Promise.all([
    supabase
      .from("user_tasks")
      .select("*, deals(deal_id, company, stage), coaching_threads(thread_id, title)")
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("deals")
      .select("deal_id, company, stage")
      .eq("user_id", user.id)
      .not("stage", "in", "(closed_won,closed_lost)")
      .order("company", { ascending: true }),
  ]);

  return (
    <TasksView
      tasks={(tasksRes.data as UserTaskWithDeal[]) ?? []}
      deals={(dealsRes.data as Pick<Deal, "deal_id" | "company" | "stage">[]) ?? []}
    />
  );
}
