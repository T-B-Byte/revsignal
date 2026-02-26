import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DealHeader } from "@/components/deals/deal-header";
import { ConversationTimeline } from "@/components/deals/conversation-timeline";
import { LogConversation } from "@/components/deals/log-conversation";
import { DealActionItems } from "@/components/deals/deal-action-items";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type {
  Deal,
  Conversation,
  ActionItem,
  Contact,
  DealBrief,
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

  // Fetch deal brief (if exists)
  const { data: dealBrief } = await supabase
    .from("deal_briefs")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();

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

      {/* Two column layout */}
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
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
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
        </div>
      </div>
    </div>
  );
}
