import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { DealStage } from "@/types/database";

export interface ContactThread {
  thread_id: string;
  title: string;
  thread_brief: string | null;
  last_message_at: string;
  message_count: number;
  deal_id: string | null;
  deals?: { deal_id: string; company: string; stage: DealStage } | null;
}

interface ContactThreadsProps {
  threads: ContactThread[];
  contactName: string;
}

function getStageBadgeVariant(stage: DealStage): BadgeVariant {
  switch (stage) {
    case "closed_won":
      return "green";
    case "closed_lost":
      return "red";
    case "negotiation":
    case "proposal":
      return "yellow";
    case "discovery":
    case "poc_trial":
      return "blue";
    default:
      return "gray";
  }
}

const STAGE_LABELS: Record<string, string> = {
  conversation: "Conversation",
  lead: "Lead",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  poc_trial: "POC / Trial",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export function ContactThreads({ threads, contactName }: ContactThreadsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Coaching Threads
          {threads.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              ({threads.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {threads.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            No coaching threads mention this contact.
          </p>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => {
              const briefExcerpt = thread.thread_brief
                ? thread.thread_brief.length > 150
                  ? thread.thread_brief.slice(0, 150) + "..."
                  : thread.thread_brief
                : null;

              const lastActive = new Date(thread.last_message_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <Link
                  key={thread.thread_id}
                  href={`/coach/${thread.thread_id}`}
                  className="block rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 transition-colors hover:border-brand-500/30"
                >
                  <p className="text-sm font-medium text-text-primary truncate">
                    {thread.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{lastActive}</span>
                    <span>{thread.message_count} msg{thread.message_count !== 1 ? "s" : ""}</span>
                  </div>
                  {thread.deals && (
                    <div className="mt-1.5">
                      <Badge variant={getStageBadgeVariant(thread.deals.stage)} className="text-[10px]">
                        {thread.deals.company} ({STAGE_LABELS[thread.deals.stage] ?? thread.deals.stage})
                      </Badge>
                    </div>
                  )}
                  {briefExcerpt && (
                    <p className="mt-1.5 text-xs text-text-muted leading-relaxed">
                      {briefExcerpt}
                    </p>
                  )}
                </Link>
              );
            })}

            <Link
              href={`/coach?new=1&contact_name=${encodeURIComponent(contactName)}`}
              className="block rounded-md border border-dashed border-border-primary p-2 text-center text-xs text-text-muted hover:border-brand-500/30 hover:text-brand-500 transition-colors"
            >
              + New thread about {contactName}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
