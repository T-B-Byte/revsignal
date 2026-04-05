import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DealHeader } from "@/components/deals/deal-header";
import { ConversationTimeline } from "@/components/deals/conversation-timeline";
import { LogConversation } from "@/components/deals/log-conversation";
import { DealActionItems } from "@/components/deals/deal-action-items";
import { DealThreads } from "@/components/deals/deal-threads";
import { DealStrategy } from "@/components/deals/deal-strategy";
import { TranscriptAnalysis } from "@/components/deals/transcript-analysis";
import { DealHub } from "@/components/deals/deal-hub";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/stripe/config";
import {
  ACTIVE_STAGES,
  type Deal,
  type Conversation,
  type ActionItem,
  type Contact,
  type DealBrief,
  type SubscriptionTier,
  type UserTaskWithDeal,
  type CoachingThread,
  type DealInsightWithThread,
} from "@/types/database";

interface DealDetailPageProps {
  params: Promise<{ dealId: string }>;
}

export async function generateMetadata({ params }: DealDetailPageProps) {
  const { dealId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: "Deal | RevSignal" };
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("company")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single();

  return {
    title: deal ? `${deal.company} | RevSignal` : "Deal | RevSignal",
  };
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { dealId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single();

  if (dealError || !deal) {
    notFound();
  }

  // Fetch conversations for this deal
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  // Fetch action items for this deal
  const { data: actionItems } = await supabase
    .from("action_items")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch contacts referenced in the deal
  const contactIds = (deal as Deal).contacts?.map((c) => c.contact_id) ?? [];
  let contacts: Contact[] = [];
  if (contactIds.length > 0) {
    const { data: contactData } = await supabase
      .from("contacts")
      .select("*")
      .in("contact_id", contactIds)
      .eq("user_id", user.id);
    contacts = (contactData as Contact[]) ?? [];
  }

  // Fetch deal brief, subscription, threads (with briefs), tasks, active deals, and insights in parallel
  const [dealBriefResult, subscriptionResult, threadsResult, tasksResult, activeDealsResult, insightsResult] = await Promise.all([
    supabase
      .from("deal_briefs")
      .select("*")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .order("last_updated", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    // Enhanced: include thread_brief and participants for the hub
    supabase
      .from("coaching_threads")
      .select("thread_id, title, last_message_at, message_count, is_archived, thread_brief, participants")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false }),
    // Tasks for this deal
    supabase
      .from("user_tasks")
      .select("*, deals(deal_id, company, stage), coaching_threads(thread_id, title)")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    // Active deals for task creation dropdown
    supabase
      .from("deals")
      .select("deal_id, company, stage")
      .eq("user_id", user.id)
      .not("stage", "in", "(closed_won,closed_lost)")
      .order("company", { ascending: true }),
    // Deal insights (Karpathy wiki knowledge pages)
    supabase
      .from("deal_insights")
      .select("*, coaching_threads(thread_id, title)")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const dealBrief = dealBriefResult.data;
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? 'power';
  const hasAiAccess = PLANS[userTier].limits.aiBriefings;
  const rawThreads = (threadsResult.data ?? []) as Pick<
    CoachingThread,
    "thread_id" | "title" | "last_message_at" | "message_count" | "is_archived" | "thread_brief" | "participants"
  >[];
  const dealTasks = (tasksResult.data as UserTaskWithDeal[]) ?? [];
  const activeDeals = (activeDealsResult.data as Pick<Deal, "deal_id" | "company" | "stage">[]) ?? [];

  // Flatten thread title for insights
  const dealInsights: DealInsightWithThread[] = (insightsResult.data ?? []).map((row) => {
    const thread = row.coaching_threads as { thread_id: string; title: string } | null;
    return {
      ...row,
      coaching_threads: undefined,
      thread_title: thread?.title ?? null,
    } as DealInsightWithThread;
  });

  // Enrich threads with follow-up counts and open task counts for ranking
  const threadIds = rawThreads.map((t) => t.thread_id);
  let followUpMap: Record<string, { count: number; has_overdue: boolean }> = {};
  let taskCountMap: Record<string, number> = {};

  if (threadIds.length > 0) {
    const [followUpsResult, threadTasksResult] = await Promise.all([
      supabase
        .from("thread_follow_ups")
        .select("thread_id, due_date")
        .eq("user_id", user.id)
        .eq("status", "open")
        .in("thread_id", threadIds),
      supabase
        .from("user_tasks")
        .select("thread_id")
        .eq("user_id", user.id)
        .eq("status", "open")
        .in("thread_id", threadIds),
    ]);

    const today = new Date().toISOString().split("T")[0];
    for (const fu of followUpsResult.data ?? []) {
      if (!followUpMap[fu.thread_id]) {
        followUpMap[fu.thread_id] = { count: 0, has_overdue: false };
      }
      followUpMap[fu.thread_id].count++;
      if (fu.due_date && fu.due_date < today) {
        followUpMap[fu.thread_id].has_overdue = true;
      }
    }

    for (const task of threadTasksResult.data ?? []) {
      if (task.thread_id) {
        taskCountMap[task.thread_id] = (taskCountMap[task.thread_id] ?? 0) + 1;
      }
    }
  }

  const linkedThreads = rawThreads.map((t) => ({
    ...t,
    open_follow_up_count: followUpMap[t.thread_id]?.count ?? 0,
    has_overdue: followUpMap[t.thread_id]?.has_overdue ?? false,
    open_task_count: taskCountMap[t.thread_id] ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link
          href="/deals"
          className="hover:text-text-primary transition-colors"
        >
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-text-primary">{(deal as Deal).company}</span>
      </nav>

      {/* Deal Header */}
      <DealHeader deal={deal as Deal} />

      {/* Tabbed Hub */}
      <DealHub
        dealId={dealId}
        company={(deal as Deal).company}
        threads={linkedThreads}
        tasks={dealTasks}
        deals={activeDeals}
        insights={dealInsights}
      >
        {/* Overview tab content (original layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Log conversation button + timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Conversations
                </h2>
                <LogConversation
                  dealId={dealId}
                  contacts={contacts}
                />
              </div>
              <ConversationTimeline
                conversations={(conversations as Conversation[]) ?? []}
              />
            </div>
          </div>

          {/* Sidebar - 1/3 */}
          <div className="space-y-6">
            {/* StrategyGPT Threads */}
            <DealThreads
              threads={linkedThreads}
              dealId={dealId}
              company={(deal as Deal).company}
            />

            {/* Action Items */}
            <DealActionItems
              actionItems={(actionItems as ActionItem[]) ?? []}
              dealId={dealId}
            />

            {/* Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Contacts
                  {contacts.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      ({contacts.length})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-sm text-text-muted py-4 text-center">
                    No contacts linked to this deal yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {contacts.map((contact) => (
                      <li key={contact.contact_id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-xs font-bold text-accent-primary">
                          {contact.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {contact.name}
                          </p>
                          {contact.role && (
                            <p className="text-xs text-text-muted">{contact.role}</p>
                          )}
                          {contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                            <a
                              href={`mailto:${encodeURIComponent(contact.email)}`}
                              className="text-xs text-accent-primary hover:underline"
                            >
                              {contact.email}
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Deal Brief */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Brief</CardTitle>
              </CardHeader>
              <CardContent>
                {dealBrief ? (
                  <div className="space-y-2">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {(dealBrief as DealBrief).brief_text}
                    </p>
                    <p className="text-xs text-text-muted">
                      Last updated:{" "}
                      {new Date(
                        (dealBrief as DealBrief).last_updated
                      ).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-text-muted">
                      No AI-generated deal brief yet.
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      The Strategist will generate a brief once there are enough
                      conversations to analyze.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deal Strategy */}
            <DealStrategy dealId={dealId} hasAiAccess={hasAiAccess} />

            {/* Transcript Analysis */}
            <TranscriptAnalysis
              dealId={dealId}
              hasAiAccess={hasAiAccess}
              company={(deal as Deal).company}
            />

          </div>
        </div>
      </DealHub>
    </div>
  );
}
