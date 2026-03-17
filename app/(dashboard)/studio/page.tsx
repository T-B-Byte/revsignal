import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudioList } from "@/components/studio/studio-list";

export const metadata = { title: "Studio — RevSignal" };

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <StudioList initialProjects={projects ?? []} />;
}
