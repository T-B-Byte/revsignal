import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import type { ChannelType } from '@/types/database';

export interface ActivityItem {
  conversation_id: string;
  company: string | null;
  contact_name: string | null;
  channel: ChannelType;
  date: string;
  summary: string | null;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const CHANNEL_ICONS: Record<ChannelType, { label: string; icon: string }> = {
  teams: { label: 'Teams', icon: 'T' },
  email: { label: 'Email', icon: '@' },
  call: { label: 'Call', icon: 'C' },
  linkedin: { label: 'LinkedIn', icon: 'in' },
  in_person: { label: 'In Person', icon: 'IP' },
  internal: { label: 'Internal', icon: 'Int' },
  manual: { label: 'Manual', icon: 'M' },
};

const CHANNEL_COLORS: Record<ChannelType, string> = {
  teams: 'bg-accent-secondary/20 text-accent-secondary',
  email: 'bg-brand-500/20 text-brand-500',
  call: 'bg-status-green/20 text-status-green',
  linkedin: 'bg-brand-500/20 text-brand-500',
  in_person: 'bg-status-yellow/20 text-status-yellow',
  internal: 'bg-orange-500/20 text-orange-400',
  manual: 'bg-white/5 text-text-muted',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No conversations logged yet. Start by logging your first interaction.
          </p>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => {
              const channelInfo = CHANNEL_ICONS[activity.channel] ?? { label: activity.channel, icon: '?' };
              const colorClass = CHANNEL_COLORS[activity.channel] ?? 'bg-surface-tertiary text-text-muted';
              let timeAgo: string;
              try {
                timeAgo = formatDistanceToNow(new Date(activity.date), {
                  addSuffix: true,
                });
              } catch {
                timeAgo = activity.date;
              }

              return (
                <li
                  key={activity.conversation_id}
                  className="flex items-start gap-3"
                >
                  {/* Channel icon */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${colorClass}`}
                  >
                    {channelInfo.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {activity.company ?? 'Unknown Company'}
                        {activity.contact_name && (
                          <span className="font-normal text-text-muted">
                            {' '}
                            &mdash; {activity.contact_name}
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 text-xs text-text-muted">
                        {timeAgo}
                      </span>
                    </div>
                    {activity.summary && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                        {activity.summary}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
