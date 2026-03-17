import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import type { CoachingMessage } from "@/types/database";

type PageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("studio_projects")
    .select("title")
    .eq("project_id", projectId)
    .maybeSingle();
  return { title: project ? `${project.title} | Studio | RevSignal` : "Studio | RevSignal" };
}

export default async function StudioProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) notFound();

  // Fetch thread messages if thread exists
  let messages: CoachingMessage[] = [];
  if (project.thread_id) {
    const { data } = await supabase
      .from("coaching_conversations")
      .select("*")
      .eq("thread_id", project.thread_id)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = (data as CoachingMessage[]) ?? [];
  }

  // Fetch thread record
  let thread = null;
  if (project.thread_id) {
    const { data } = await supabase
      .from("coaching_threads")
      .select("*")
      .eq("thread_id", project.thread_id)
      .eq("user_id", user.id)
      .maybeSingle();
    thread = data;
  }

  return (
    <StudioWorkspace
      project={project}
      thread={thread}
      initialMessages={messages}
    />
  );
}
