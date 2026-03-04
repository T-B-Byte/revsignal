import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { EmailComposer } from "@/components/compose/email-composer";
import type { SubscriptionTier } from "@/types/database";
import { ACTIVE_STAGES } from "@/types/database";

interface ComposePageProps {
  searchParams: Promise<{ dealId?: string; contactId?: string }>;
}

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [dealsResult, contactsResult, subscriptionResult] = await Promise.all([
    supabase
      .from("deals")
      .select("deal_id, company, stage")
      .eq("user_id", user.id)
      .in("stage", ACTIVE_STAGES)
      .order("last_activity_date", { ascending: false }),
    supabase
      .from("contacts")
      .select("contact_id, name, company, role")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const deals = (dealsResult.data ?? []) as Array<{
    deal_id: string;
    company: string;
    stage: string;
  }>;
  const contacts = (contactsResult.data ?? []) as Array<{
    contact_id: string;
    name: string;
    company: string;
    role: string | null;
  }>;
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? 'power';
  const hasComposeAccess = PLANS[userTier].limits.integrations;

  return (
    <EmailComposer
      deals={deals}
      contacts={contacts}
      hasComposeAccess={hasComposeAccess}
      initialDealId={resolvedParams.dealId}
      initialContactId={resolvedParams.contactId}
    />
  );
}
