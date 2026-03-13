import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MaDetailView } from "@/components/ma/ma-detail-view";
import type { MaEntity, MaContact, MaNote, MaDocument, CoachingThread, CoachingMessage } from "@/types/database";

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

  // Fetch entity, contacts, notes, documents, and coaching thread in parallel
  const [entityResult, contactsResult, notesResult, documentsResult, threadResult] = await Promise.all([
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
    supabase
      .from("ma_documents")
      .select("*")
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("coaching_threads")
      .select("*")
      .eq("ma_entity_id", entityId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (entityResult.error || !entityResult.data) {
    notFound();
  }

  const entity = entityResult.data as MaEntity;

  // Auto-create a coaching thread for this MA entity if one doesn't exist
  let thread = threadResult.data as CoachingThread | null;
  if (!thread) {
    const { data: newThread, error: createErr } = await supabase
      .from("coaching_threads")
      .insert({
        user_id: user.id,
        title: entity.company,
        company: entity.company,
        ma_entity_id: entityId,
      })
      .select()
      .single();

    if (createErr) {
      // Race condition: another request may have created the thread
      const { data: retryThread } = await supabase
        .from("coaching_threads")
        .select("*")
        .eq("ma_entity_id", entityId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      thread = retryThread as CoachingThread | null;
    } else {
      thread = newThread as CoachingThread | null;
    }
  }

  // Fetch thread messages if thread exists
  let messages: CoachingMessage[] = [];
  if (thread) {
    const { data: threadMessages } = await supabase
      .from("coaching_conversations")
      .select("*")
      .eq("thread_id", thread.thread_id)
      .order("created_at", { ascending: true });

    messages = (threadMessages as CoachingMessage[]) ?? [];
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
          {entity.company}
        </span>
      </nav>

      <MaDetailView
        entity={entity}
        contacts={(contactsResult.data as MaContact[]) ?? []}
        notes={(notesResult.data as MaNote[]) ?? []}
        documents={(documentsResult.data as MaDocument[]) ?? []}
        thread={thread}
        initialMessages={messages}
      />
    </div>
  );
}
