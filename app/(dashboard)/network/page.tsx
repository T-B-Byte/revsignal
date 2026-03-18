import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCardsView } from "@/components/network/project-cards-view";
import type { ProjectWithMembers } from "@/types/database";

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

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, project_members(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch projects:", error.message);
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
        <p className="text-sm text-text-muted">
          Your DaaS partnerships and initiatives
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ProjectCardsView
          initialProjects={(projects as ProjectWithMembers[]) ?? []}
        />
      </div>
    </div>
  );
}
