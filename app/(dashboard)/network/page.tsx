import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NetworkView } from "@/components/network/network-view";
import type { ProjectWithMembers } from "@/types/database";

export const metadata = {
  title: "Network | RevSignal",
  description: "Visual relationship map of your projects and collaborators.",
};

export default async function NetworkPage() {
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
        <h1 className="text-2xl font-bold text-text-primary">Network</h1>
        <p className="text-sm text-text-muted">
          Who you&apos;re working with and what you&apos;re working on together
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <NetworkView
          initialProjects={(projects as ProjectWithMembers[]) ?? []}
        />
      </div>
    </div>
  );
}
