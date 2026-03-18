import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BoardReportBuilder } from "@/components/board-report/board-report-builder";

export const metadata = {
  title: "Board Report | RevSignal",
  description: "Generate board meeting one-pagers from your pipeline data.",
};

export default async function BoardReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <BoardReportBuilder />
    </div>
  );
}
