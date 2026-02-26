import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ACTIVE_STAGES, type DealStage } from '@/types/database';
import { RevenueTracker } from '@/components/dashboard/revenue-tracker';
import { PipelineSummary, type PipelineStageData } from '@/components/dashboard/pipeline-summary';
import { FollowUpAlerts, type FollowUpGroup } from '@/components/dashboard/followup-alerts';
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/activity-feed';
import { DaysSinceContact, type DealContactInfo } from '@/components/dashboard/days-since-contact';
import { RevenueMath } from '@/components/dashboard/revenue-math';
import { PlaybookProgress, type WorkstreamProgress } from '@/components/dashboard/playbook-progress';
import { QuickActions } from '@/components/dashboard/quick-actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // --- Fetch all dashboard data in parallel ---
  const [
    closedWonResult,
    activeDealsResult,
    actionItemsResult,
    recentConversationsResult,
    playbookResult,
  ] = await Promise.all([
    // 1. Closed revenue: sum of ACV where stage = 'closed_won'
    supabase
      .from('deals')
      .select('acv')
      .eq('user_id', user.id)
      .eq('stage', 'closed_won'),

    // 2. Active deals (for pipeline + days since contact)
    supabase
      .from('deals')
      .select('deal_id, company, stage, acv, last_activity_date')
      .eq('user_id', user.id)
      .in('stage', ACTIVE_STAGES),

    // 3. Action items for follow-up alerts
    supabase
      .from('action_items')
      .select('item_id, description, due_date, owner, escalation_level, deal_id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'overdue'])
      .order('escalation_level', { ascending: true }),

    // 4. Recent conversations with deal + contact info
    supabase
      .from('conversations')
      .select('conversation_id, date, channel, ai_summary, deal_id, contact_id')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(10),

    // 5. Playbook items
    supabase
      .from('playbook_items')
      .select('workstream, status')
      .eq('user_id', user.id),
  ]);

  // --- Process closed revenue ---
  const closedRevenue = (closedWonResult.data ?? []).reduce(
    (sum, d) => sum + (d.acv ?? 0),
    0
  );

  // --- Process pipeline stages ---
  const stageMap = new Map<DealStage, { count: number; totalAcv: number }>();
  for (const deal of activeDealsResult.data ?? []) {
    const stage = deal.stage as DealStage;
    const existing = stageMap.get(stage) ?? { count: 0, totalAcv: 0 };
    existing.count += 1;
    existing.totalAcv += deal.acv ?? 0;
    stageMap.set(stage, existing);
  }
  const pipelineStages: PipelineStageData[] = Array.from(stageMap.entries()).map(
    ([stage, data]) => ({
      stage,
      count: data.count,
      totalAcv: data.totalAcv,
    })
  );

  // --- Process follow-up alerts ---
  // We need to resolve deal companies for the action items.
  // Build a deal_id -> company lookup from active deals.
  const dealCompanyMap = new Map<string, string>();
  for (const deal of activeDealsResult.data ?? []) {
    dealCompanyMap.set(deal.deal_id, deal.company);
  }
  // Also include closed_won deals for their company names
  // (action items might reference them), but we already have active deals.
  // Group action items by escalation level.
  const escalationGroups = new Map<string, FollowUpGroup['items']>();
  for (const item of actionItemsResult.data ?? []) {
    const level = item.escalation_level as string;
    const group = escalationGroups.get(level) ?? [];
    group.push({
      item_id: item.item_id,
      description: item.description,
      due_date: item.due_date,
      owner: item.owner,
      deal_company: item.deal_id ? (dealCompanyMap.get(item.deal_id) ?? null) : null,
    });
    escalationGroups.set(level, group);
  }
  const followUpGroups: FollowUpGroup[] = (['red', 'yellow', 'green'] as const).map(
    (level) => ({
      level,
      items: escalationGroups.get(level) ?? [],
    })
  );

  // --- Process recent activity ---
  // For activity feed, we need contact names and deal companies.
  // Fetch contacts and deals referenced in conversations.
  const conversationData = recentConversationsResult.data ?? [];
  const contactIds = [
    ...new Set(conversationData.map((c) => c.contact_id).filter(Boolean)),
  ] as string[];
  const dealIds = [
    ...new Set(conversationData.map((c) => c.deal_id).filter(Boolean)),
  ] as string[];

  const [contactsResult, dealsForConvResult] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from('contacts')
          .select('contact_id, name, company')
          .in('contact_id', contactIds)
      : Promise.resolve({ data: [] as { contact_id: string; name: string; company: string }[] }),
    dealIds.length > 0
      ? supabase
          .from('deals')
          .select('deal_id, company')
          .in('deal_id', dealIds)
      : Promise.resolve({ data: [] as { deal_id: string; company: string }[] }),
  ]);

  const contactMap = new Map(
    (contactsResult.data ?? []).map((c) => [c.contact_id, c])
  );
  const dealMap = new Map(
    (dealsForConvResult.data ?? []).map((d) => [d.deal_id, d])
  );

  const activities: ActivityItem[] = conversationData.map((conv) => {
    const contact = conv.contact_id ? contactMap.get(conv.contact_id) : null;
    const deal = conv.deal_id ? dealMap.get(conv.deal_id) : null;
    return {
      conversation_id: conv.conversation_id,
      company: deal?.company ?? contact?.company ?? null,
      contact_name: contact?.name ?? null,
      channel: conv.channel,
      date: conv.date,
      summary: conv.ai_summary,
    };
  });

  // --- Process days since contact ---
  const dealContactInfos: DealContactInfo[] = (activeDealsResult.data ?? []).map(
    (deal) => ({
      deal_id: deal.deal_id,
      company: deal.company,
      stage: deal.stage as DealStage,
      acv: deal.acv,
      last_activity_date: deal.last_activity_date,
    })
  );

  // --- Process playbook progress ---
  const workstreamMap = new Map<
    string,
    { completed: number; total: number }
  >();
  for (const item of playbookResult.data ?? []) {
    const ws = item.workstream;
    const existing = workstreamMap.get(ws) ?? { completed: 0, total: 0 };
    existing.total += 1;
    if (item.status === 'completed') {
      existing.completed += 1;
    }
    workstreamMap.set(ws, existing);
  }
  const workstreams: WorkstreamProgress[] = Array.from(
    workstreamMap.entries()
  ).map(([workstream, data]) => ({
    workstream,
    completed: data.completed,
    total: data.total,
  }));

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Revenue Command Center
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Track your path to $1M. Every signal matters.
        </p>
      </div>

      {/* Row 1: Revenue Tracker (wide) + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTracker closedRevenue={closedRevenue} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Row 2: Pipeline Summary + Follow-Up Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineSummary stages={pipelineStages} />
        <FollowUpAlerts groups={followUpGroups} />
      </div>

      {/* Row 3: Days Since Contact + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DaysSinceContact deals={dealContactInfos} />
        <ActivityFeed activities={activities} />
      </div>

      {/* Row 4: Revenue Math + Playbook Progress */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueMath />
        <PlaybookProgress workstreams={workstreams} />
      </div>
    </div>
  );
}
