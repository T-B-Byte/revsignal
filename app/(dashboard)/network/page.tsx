import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NetworkView } from "@/components/network/network-view";
import { ACTIVE_STAGES } from "@/types/database";
import type { Deal, Contact } from "@/types/database";

export const metadata = {
  title: "Network | RevSignal",
  description: "Visual relationship map of your deals and contacts.",
};

export default async function NetworkPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch active deals and all contacts in parallel
  const [dealsResult, contactsResult] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", user.id)
      .in("stage", ACTIVE_STAGES)
      .order("last_activity_date", { ascending: false }),
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id),
  ]);

  if (dealsResult.error) {
    console.error("Failed to fetch deals:", dealsResult.error.message);
  }
  if (contactsResult.error) {
    console.error("Failed to fetch contacts:", contactsResult.error.message);
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Network</h1>
        <p className="text-sm text-text-muted">
          Relationship map of your active pipeline
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <NetworkView
          deals={(dealsResult.data as Deal[]) ?? []}
          contacts={(contactsResult.data as Contact[]) ?? []}
        />
      </div>
    </div>
  );
}
