import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DealsView } from "@/components/deals/deals-view";
import type { Deal } from "@/types/database";

export const metadata = {
  title: "Pipeline | RevSignal",
  description: "Manage your deal pipeline and track revenue progress.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all deals for this user, ordered by last activity
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", user.id)
    .order("last_activity_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch deals:", error.message);
  }

  // Extract unique ICP categories from contacts for filtering
  // In production, this would come from the contacts table
  const { data: contacts } = await supabase
    .from("contacts")
    .select("icp_category")
    .eq("user_id", user.id)
    .not("icp_category", "is", null);

  const icpCategories = Array.from(
    new Set(
      (contacts ?? [])
        .map((c) => c.icp_category)
        .filter((cat): cat is string => cat !== null)
    )
  ).sort();

  const params = await searchParams;
  const openNewDeal = params.new === "true";

  return (
    <DealsView
      deals={(deals as Deal[]) ?? []}
      icpCategories={icpCategories}
      openNewDeal={openNewDeal}
    />
  );
}
