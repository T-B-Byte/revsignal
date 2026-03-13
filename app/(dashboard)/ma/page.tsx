import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MaView } from "@/components/ma/ma-view";
import type { MaEntity, MaEntityWithCounts } from "@/types/database";

export const metadata = {
  title: "M&A | RevSignal",
  description: "Track potential acquirers and acquisition targets.",
};

export default async function MaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all M&A entities for this user
  const { data: entities } = await supabase
    .from("ma_entities")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch contact counts per entity
  const { data: contactCounts } = await supabase
    .from("ma_contacts")
    .select("entity_id")
    .eq("user_id", user.id);

  // Fetch note counts per entity
  const { data: noteCounts } = await supabase
    .from("ma_notes")
    .select("entity_id")
    .eq("user_id", user.id);

  // Build count maps
  const contactCountMap: Record<string, number> = {};
  for (const c of contactCounts ?? []) {
    contactCountMap[c.entity_id] = (contactCountMap[c.entity_id] ?? 0) + 1;
  }

  const noteCountMap: Record<string, number> = {};
  for (const n of noteCounts ?? []) {
    noteCountMap[n.entity_id] = (noteCountMap[n.entity_id] ?? 0) + 1;
  }

  // Merge counts into entities
  const entitiesWithCounts: MaEntityWithCounts[] = ((entities as MaEntity[]) ?? []).map(
    (entity) => ({
      ...entity,
      contact_count: contactCountMap[entity.entity_id] ?? 0,
      note_count: noteCountMap[entity.entity_id] ?? 0,
    })
  );

  return <MaView entities={entitiesWithCounts} />;
}
