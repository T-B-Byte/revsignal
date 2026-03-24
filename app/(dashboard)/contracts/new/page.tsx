import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UseCaseBuilder } from "@/components/contracts/use-case-builder";
import { ACTIVE_STAGES } from "@/types/database";

export default async function NewUseCasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active deals for the deal selector
  const { data: deals } = await supabase
    .from("deals")
    .select("deal_id, company, stage, acv")
    .eq("user_id", user.id)
    .in("stage", ACTIVE_STAGES)
    .order("company");

  return (
    <div>
      <div className="mx-auto max-w-4xl mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          New Use Case
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Build an intended use exhibit for a DaaS licensing deal. Each section maps to a contract provision.
        </p>
      </div>

      <UseCaseBuilder deals={deals ?? []} />
    </div>
  );
}
