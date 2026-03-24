import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCardsView } from "@/components/network/project-cards-view";
import type { ProjectWithMembers, ProjectWithMembersAndThreads } from "@/types/database";

export const metadata = {
  title: "Projects | RevSignal",
  description: "Your DaaS partnerships and initiatives at a glance.",
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch projects with members
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, project_members(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch projects:", error.message);
  }

  const projectList = (projects as ProjectWithMembers[]) ?? [];

  // Fetch linked coaching threads for all projects
  const projectIds = projectList.map((p) => p.project_id);
  let threadsMap: Record<string, ProjectWithMembersAndThreads["linked_threads"]> = {};

  if (projectIds.length > 0) {
    const { data: threads } = await supabase
      .from("coaching_threads")
      .select("thread_id, title, thread_brief, catchup_text, last_message_at, message_count, project_id")
      .eq("user_id", user.id)
      .in("project_id", projectIds)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false });

    if (threads) {
      for (const t of threads) {
        const pid = t.project_id as string;
        if (!threadsMap[pid]) threadsMap[pid] = [];
        threadsMap[pid]!.push({
          thread_id: t.thread_id,
          title: t.title,
          thread_brief: t.thread_brief,
          catchup_text: t.catchup_text,
          last_message_at: t.last_message_at,
          message_count: t.message_count,
        });
      }
    }
  }

  // Merge threads into projects
  const enrichedProjects: ProjectWithMembersAndThreads[] = projectList.map((p) => ({
    ...p,
    linked_threads: threadsMap[p.project_id] ?? [],
  }));

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
        <p className="text-sm text-text-muted">
          Your DaaS partnerships and initiatives
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ProjectCardsView initialProjects={enrichedProjects} />
      </div>
    </div>
  );
}
