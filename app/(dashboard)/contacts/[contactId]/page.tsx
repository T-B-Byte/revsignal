import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ContactHeader } from "@/components/contacts/contact-header";
import { ConversationTimeline } from "@/components/deals/conversation-timeline";
import { LogConversationForContact } from "@/components/contacts/log-conversation-for-contact";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { TalkingPointsCard } from "@/components/contacts/talking-points-card";
import type {
  Contact,
  Conversation,
  ActionItem,
  Deal,
  DealStage,
  ContactRef,
  EscalationLevel,
  TalkingPointWithThread,
} from "@/types/database";
import { format } from "date-fns";

interface ContactDetailPageProps {
  params: Promise<{ contactId: string }>;
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

function getEscalationVariant(level: EscalationLevel): BadgeVariant {
  switch (level) {
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "red":
      return "red";
    default:
      return "gray";
  }
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  poc_trial: "POC / Trial",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export async function generateMetadata({ params }: ContactDetailPageProps) {
  const { contactId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: "Contact | RevSignal" };
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("name, company")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .single();

  return {
    title: contact
      ? `${contact.name} — ${contact.company} | RevSignal`
      : "Contact | RevSignal",
  };
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { contactId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .single();

  if (contactError || !contact) {
    notFound();
  }

  // Parallel fetch: conversations, action items, deals, talking points
  const [conversationsResult, actionItemsResult, dealsResult, talkingPointsResult] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .eq("user_id", user.id)
        .order("date", { ascending: false }),

      supabase
        .from("action_items")
        .select("*")
        .eq("contact_id", contactId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("deals")
        .select("deal_id, company, stage, acv, contacts")
        .eq("user_id", user.id),

      supabase
        .from("talking_points")
        .select(`
          *,
          coaching_threads:thread_id (thread_id, title)
        `)
        .eq("contact_id", contactId)
        .eq("user_id", user.id)
        .order("is_completed", { ascending: true })
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

  const conversations = (conversationsResult.data as Conversation[]) ?? [];
  const actionItems = (actionItemsResult.data as ActionItem[]) ?? [];
  const talkingPoints = (talkingPointsResult.data as TalkingPointWithThread[]) ?? [];

  // Filter deals that reference this contact in their JSONB contacts array
  const relatedDeals = ((dealsResult.data as Deal[]) ?? []).filter((d) =>
    (d.contacts as ContactRef[])?.some((c) => c.contact_id === contactId)
  );

  const openItems = actionItems.filter(
    (item) => item.status === "pending" || item.status === "overdue"
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link
          href="/contacts"
          className="hover:text-text-primary transition-colors"
        >
          Contacts
        </Link>
        <span>/</span>
        <span className="text-text-primary">
          {(contact as Contact).name}
        </span>
      </nav>

      {/* Contact Header */}
      <ContactHeader contact={contact as Contact} />

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Conversations
              </h2>
              <LogConversationForContact
                contactId={contactId}
                deals={relatedDeals.map((d) => ({
                  deal_id: d.deal_id,
                  company: d.company,
                }))}
              />
            </div>
            <ConversationTimeline conversations={conversations} />
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Talking Points */}
          <TalkingPointsCard
            contactId={contactId}
            initialPoints={talkingPoints}
          />

          {/* Linked Deals */}
          <Card>
            <CardHeader>
              <CardTitle>
                Linked Deals
                {relatedDeals.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    ({relatedDeals.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedDeals.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  Not linked to any deals yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {relatedDeals.map((deal) => (
                    <li key={deal.deal_id}>
                      <Link
                        href={`/deals/${deal.deal_id}`}
                        className="block rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 transition-colors hover:border-border-hover"
                      >
                        <p className="text-sm font-medium text-text-primary">
                          {deal.company}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStageBadgeVariant(deal.stage)}>
                            {STAGE_LABELS[deal.stage] ?? deal.stage}
                          </Badge>
                          {deal.acv !== null && (
                            <span className="text-xs text-text-muted">
                              {acvFormatter.format(deal.acv)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Action Items (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>
                Action Items
                {openItems.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    ({openItems.length} open)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  No action items for this contact.
                </p>
              ) : (
                <div className="space-y-3">
                  {openItems.map((item) => (
                    <div key={item.item_id} className="flex items-start gap-2">
                      <span
                        className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${
                          item.status === "overdue"
                            ? "bg-status-red"
                            : "bg-accent-primary"
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${
                            item.status === "overdue"
                              ? "text-status-red"
                              : "text-text-primary"
                          }`}
                        >
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={item.owner === "me" ? "blue" : "yellow"}
                            className="text-[10px]"
                          >
                            {item.owner === "me" ? "You" : "Them"}
                          </Badge>
                          {item.due_date && (
                            <span className="text-[10px] text-text-muted">
                              Due:{" "}
                              {format(new Date(item.due_date), "MMM d, yyyy")}
                            </span>
                          )}
                          <Badge
                            variant={getEscalationVariant(
                              item.escalation_level
                            )}
                            className="text-[10px]"
                          >
                            {item.escalation_level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}

                  {actionItems.length > openItems.length && (
                    <p className="text-xs text-text-muted pt-1">
                      {actionItems.length - openItems.length} completed
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
