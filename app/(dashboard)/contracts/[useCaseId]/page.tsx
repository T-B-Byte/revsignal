import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UseCaseDetail } from "@/components/contracts/use-case-detail";
import { ACTIVE_STAGES } from "@/types/database";
import type { DaasUseCase } from "@/types/database";

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ useCaseId: string }>;
}) {
  const { useCaseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Validate UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(useCaseId)) {
    notFound();
  }

  const { data: useCase, error } = await supabase
    .from("daas_use_cases")
    .select("*, deals(deal_id, company, stage, acv)")
    .eq("use_case_id", useCaseId)
    .eq("user_id", user.id)
    .single();

  if (error || !useCase) notFound();

  // Fetch active deals for edit mode
  const { data: deals } = await supabase
    .from("deals")
    .select("deal_id, company, stage, acv")
    .eq("user_id", user.id)
    .in("stage", ACTIVE_STAGES)
    .order("company");

  return (
    <UseCaseDetail
      useCase={useCase as DaasUseCase & { deals?: { deal_id: string; company: string; stage: string; acv: number | null } | null }}
      deals={deals ?? []}
    />
  );
}
