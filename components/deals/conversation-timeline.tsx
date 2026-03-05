"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Conversation, ChannelType } from "@/types/database";
import { format, formatDistanceToNow } from "date-fns";

interface ConversationTimelineProps {
  conversations: Conversation[];
}

function getChannelConfig(channel: ChannelType): {
  label: string;
  variant: BadgeVariant;
  icon: string;
} {
  switch (channel) {
    case "teams":
      return { label: "Teams", variant: "blue", icon: "T" };
    case "email":
      return { label: "Email", variant: "gray", icon: "E" };
    case "call":
      return { label: "Call", variant: "green", icon: "C" };
    case "linkedin":
      return { label: "LinkedIn", variant: "blue", icon: "L" };
    case "in_person":
      return { label: "In Person", variant: "yellow", icon: "P" };
    case "manual":
      return { label: "Manual", variant: "gray", icon: "M" };
    case "internal":
      return { label: "Internal", variant: "yellow", icon: "I" };
    default:
      return { label: channel, variant: "gray", icon: "?" };
  }
}

export function ConversationTimeline({
  conversations,
}: ConversationTimelineProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <svg
          className="w-10 h-10 mb-3 opacity-30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">No conversations logged yet.</p>
        <p className="text-xs mt-1">
          Log your first interaction to start building deal context.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv, index) => {
        const channelConfig = getChannelConfig(conv.channel);

        return (
          <div key={conv.conversation_id} className="relative flex gap-3">
            {/* Timeline line */}
            {index < conversations.length - 1 && (
              <div className="absolute left-4 top-10 bottom-0 w-px bg-border-primary" />
            )}

            {/* Timeline dot */}
            <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-surface-secondary border border-border-primary flex items-center justify-center text-xs font-bold text-text-secondary">
              {channelConfig.icon}
            </div>

            {/* Content */}
            <Card className="flex-1">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={channelConfig.variant}>
                      {channelConfig.label}
                    </Badge>
                    {conv.subject && (
                      <span className="text-sm font-medium text-text-primary">
                        {conv.subject}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted flex-shrink-0">
                    <span>{format(new Date(conv.date), "MMM d, yyyy")}</span>
                    <span>
                      {formatDistanceToNow(new Date(conv.date), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Summary or raw text preview */}
                <div className="text-sm text-text-secondary">
                  {conv.ai_summary ? (
                    <p>{conv.ai_summary}</p>
                  ) : conv.raw_text ? (
                    <p className="line-clamp-3">{conv.raw_text}</p>
                  ) : (
                    <p className="text-text-muted italic">
                      No content recorded
                    </p>
                  )}
                </div>

                {/* Inline action items from conversation */}
                {conv.action_items && conv.action_items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border-primary">
                    <p className="text-xs font-medium text-text-muted mb-1">
                      Action items:
                    </p>
                    <ul className="space-y-1">
                      {conv.action_items.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-text-secondary"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              item.owner === "me"
                                ? "bg-accent-primary"
                                : "bg-status-yellow"
                            }`}
                          />
                          <span>{item.description}</span>
                          {item.owner && (
                            <Badge
                              variant={
                                item.owner === "me" ? "blue" : "yellow"
                              }
                              className="text-[10px]"
                            >
                              {item.owner === "me" ? "You" : "Them"}
                            </Badge>
                          )}
                          {item.due_date && (
                            <span className="text-text-muted">
                              Due:{" "}
                              {format(new Date(item.due_date), "MMM d")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow-up date */}
                {conv.follow_up_date && (
                  <div className="mt-2 pt-2 border-t border-border-primary">
                    <span className="text-xs text-text-muted">
                      Follow-up:{" "}
                      {format(new Date(conv.follow_up_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
