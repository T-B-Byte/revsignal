import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TradeshowDetailView } from "@/components/tradeshows/tradeshow-detail-view";
import type {
  Tradeshow,
  TradeshowTarget,
  TradeshowContact,
} from "@/types/database";

interface TradeshowDetailPageProps {
  params: Promise<{ tradeshowId: string }>;
}

export async function generateMetadata({ params }: TradeshowDetailPageProps) {
  const { tradeshowId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("tradeshows")
    .select("name")
    .eq("tradeshow_id", tradeshowId)
    .maybeSingle();

  return {
    title: data?.name ? `${data.name} | RevSignal` : "Tradeshow | RevSignal",
  };
}

export default async function TradeshowDetailPage({
  params,
}: TradeshowDetailPageProps) {
  const { tradeshowId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch tradeshow
  const { data: tradeshow, error: tradeshowError } = await supabase
    .from("tradeshows")
    .select("*")
    .eq("tradeshow_id", tradeshowId)
    .eq("user_id", user.id)
    .single();

  if (tradeshowError || !tradeshow) notFound();

  // Fetch targets and contacts in parallel
  const [targetsResult, contactsResult] = await Promise.all([
    supabase
      .from("tradeshow_targets")
      .select("*")
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tradeshow_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

  const targets = (targetsResult.data as TradeshowTarget[]) ?? [];
  const allContacts = (contactsResult.data as TradeshowContact[]) ?? [];

  // Filter contacts to only those belonging to this tradeshow's targets
  const targetIds = new Set(targets.map((t) => t.target_id));
  const contacts = allContacts.filter((c) => targetIds.has(c.target_id));

  return (
    <TradeshowDetailView
      tradeshow={tradeshow as Tradeshow}
      targets={targets}
      contacts={contacts}
    />
  );
}
