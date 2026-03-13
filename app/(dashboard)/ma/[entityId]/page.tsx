import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MaDetailView } from "@/components/ma/ma-detail-view";
import type { MaEntity, MaContact, MaNote } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MaDetailPageProps {
  params: Promise<{ entityId: string }>;
}

export async function generateMetadata({ params }: MaDetailPageProps) {
  const { entityId } = await params;
  if (!UUID_REGEX.test(entityId)) return { title: "M&A | RevSignal" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: "M&A | RevSignal" };

  const { data: entity } = await supabase
    .from("ma_entities")
    .select("company")
    .eq("entity_id", entityId)
    .eq("user_id", user.id)
    .single();

  return {
    title: entity ? `${entity.company} | M&A | RevSignal` : "M&A | RevSignal",
  };
}

export default async function MaDetailPage({ params }: MaDetailPageProps) {
  const { entityId } = await params;
  if (!UUID_REGEX.test(entityId)) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch entity, contacts, and notes in parallel
  const [entityResult, contactsResult, notesResult] = await Promise.all([
    supabase
      .from("ma_entities")
      .select("*")
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("ma_contacts")
      .select("*")
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("ma_notes")
      .select("*")
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (entityResult.error || !entityResult.data) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link
          href="/ma"
          className="hover:text-text-primary transition-colors"
        >
          M&A
        </Link>
        <span>/</span>
        <span className="text-text-primary">
          {(entityResult.data as MaEntity).company}
        </span>
      </nav>

      <MaDetailView
        entity={entityResult.data as MaEntity}
        contacts={(contactsResult.data as MaContact[]) ?? []}
        notes={(notesResult.data as MaNote[]) ?? []}
      />
    </div>
  );
}
