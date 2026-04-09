"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateDealRoomDialog } from "@/components/deal-rooms/create-deal-room-dialog";
import { EditDealRoomDialog } from "@/components/deal-rooms/edit-deal-room-dialog";
import type {
  DealRoomWithCompany,
  DealRoomStatus,
  GtmCompanyProfile,
  GtmProduct,
  DealRoomQuote,
  QuoteStatus,
} from "@/types/database";

interface DealRoomsViewProps {
  rooms: DealRoomWithCompany[];
  companies: Pick<GtmCompanyProfile, "company_id" | "name" | "slug" | "logo_url">[];
  products: Pick<GtmProduct, "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type">[];
}

const STATUS_STYLES: Record<DealRoomStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-white/10", text: "text-text-muted" },
  active: { bg: "bg-status-green/15", text: "text-status-green" },
  expired: { bg: "bg-status-red/15", text: "text-status-red" },
  archived: { bg: "bg-white/10", text: "text-text-muted" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function DealRoomsView({ rooms, companies, products }: DealRoomsViewProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editRoom, setEditRoom] = useState<DealRoomWithCompany | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<DealRoomQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.status === "active").length;
    const totalViews = rooms.reduce((sum, r) => sum + (r.view_count ?? 0), 0);
    // Pending quotes would come from a join; for now count rooms with quote builder enabled
    const quoteEnabled = rooms.filter((r) => r.show_quote_builder).length;
    return { total, active, totalViews, quoteEnabled };
  }, [rooms]);

  async function handleCopyLink(slug: string) {
    const url = `${window.location.origin}/room/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Fallback: select-and-copy not needed in this context
    }
  }

  async function handleToggleQuotes(roomId: string) {
    if (expandedQuotes === roomId) {
      setExpandedQuotes(null);
      return;
    }
    setExpandedQuotes(roomId);
    setQuotesLoading(true);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}/quotes`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes ?? []);
      }
    } finally {
      setQuotesLoading(false);
    }
  }

  async function handleQuoteAction(roomId: string, quoteId: string, status: QuoteStatus) {
    setActionLoading(quoteId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}/quotes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, status }),
      });
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) => (q.quote_id === quoteId ? { ...q, status, reviewed_at: new Date().toISOString() } : q))
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleStatus(roomId: string, currentStatus: DealRoomStatus) {
    const newStatus: DealRoomStatus = currentStatus === "active" ? "draft" : "active";
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClone(roomId: string) {
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}/clone`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(roomId: string, companyName: string) {
    if (!confirm(`Delete the deal room for ${companyName}? This cannot be undone.`)) {
      return;
    }
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Deal Rooms</h1>
          <p className="mt-1 text-xs text-text-muted">
            Secure, branded portals for prospects to explore your products
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Create Deal Room
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Rooms" value={stats.total} />
        <StatCard label="Active" value={stats.active} accent />
        <StatCard label="Total Views" value={stats.totalViews} />
        <StatCard label="Quote Builder Enabled" value={stats.quoteEnabled} />
      </div>

      {/* Room cards */}
      {rooms.length === 0 ? (
        <div className="rounded-xl border border-border-primary bg-surface-tertiary p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <svg
              className="h-6 w-6 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path d="M8 5v2M16 5v2M3 10h18" />
            </svg>
          </div>
          <p className="text-sm text-text-muted mb-1">No deal rooms yet</p>
          <p className="text-xs text-text-muted mb-4">
            Create your first deal room to share a branded product portal with a prospect.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-accent-primary hover:underline cursor-pointer"
          >
            Create your first deal room
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const company = room.gtm_company_profiles;
            const companyName = company?.name ?? "Unknown Company";
            const logoUrl = room.company_logo_url ?? company?.logo_url;
            const statusStyle = STATUS_STYLES[room.status];
            const isLoading = actionLoading === room.room_id;

            return (
              <div
                key={room.room_id}
                className="glass rounded-xl p-5 flex flex-col gap-4 transition-colors hover:border-white/20"
              >
                {/* Top: company + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={companyName}
                        className="h-9 w-9 rounded-lg object-contain bg-white/5 p-1 shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-500 text-sm font-bold shrink-0">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">
                        {companyName}
                      </h3>
                      <button
                        onClick={() => handleCopyLink(room.slug)}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-500 transition-colors cursor-pointer group"
                        title="Copy link"
                      >
                        <span className="truncate max-w-[160px]">/room/{room.slug}</span>
                        {copiedSlug === room.slug ? (
                          <svg className="h-3 w-3 text-status-green shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 8.5l3 3 7-7" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="5" width="8" height="8" rx="1.5" />
                            <path d="M3 11V4a1.5 1.5 0 011.5-1.5H11" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {room.status}
                  </span>
                </div>

                {/* Password */}
                {room.password_plain && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    <span className="text-[10px] uppercase text-text-muted font-medium tracking-wider">Password</span>
                    <code className="flex-1 text-xs font-mono text-text-primary">{room.password_plain}</code>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(room.password_plain!);
                        setCopiedPassword(room.room_id);
                        setTimeout(() => setCopiedPassword(null), 2000);
                      }}
                      className="text-text-muted hover:text-brand-500 transition-colors cursor-pointer"
                      title="Copy password"
                    >
                      {copiedPassword === room.room_id ? (
                        <svg className="h-3.5 w-3.5 text-status-green" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 8.5l3 3 7-7" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="5" width="8" height="8" rx="1.5" />
                          <path d="M3 11V4a1.5 1.5 0 011.5-1.5H11" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-text-muted">Views</span>
                    <p className="text-text-primary font-medium">{room.view_count ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Last viewed</span>
                    <p className="text-text-primary font-medium">
                      {formatRelative(room.last_viewed_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Products</span>
                    <p className="text-text-primary font-medium">
                      {room.selected_products?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Expires</span>
                    <p className="text-text-primary font-medium">
                      {room.expires_at ? formatDate(room.expires_at) : "Never"}
                    </p>
                  </div>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5">
                  {room.show_audience_dashboard && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/15 text-brand-500 font-medium">
                      Audience Dashboard
                    </span>
                  )}
                  {room.show_quote_builder && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/15 text-brand-500 font-medium">
                      Quote Builder
                    </span>
                  )}
                  {room.accent_color && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-text-muted font-medium">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: room.accent_color }}
                      />
                      Custom Color
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditRoom(room)}
                    disabled={isLoading}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyLink(room.slug)}
                    disabled={isLoading}
                  >
                    {copiedSlug === room.slug ? "Copied" : "Copy Link"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleQuotes(room.room_id)}
                    disabled={isLoading}
                  >
                    Quotes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClone(room.room_id)}
                    disabled={isLoading}
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleToggleStatus(room.room_id, room.status)
                    }
                    disabled={isLoading}
                  >
                    {room.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(room.room_id, companyName)}
                    disabled={isLoading}
                  >
                    Delete
                  </Button>
                </div>

                {/* Quotes panel */}
                {expandedQuotes === room.room_id && (
                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Submitted Quotes
                    </h4>
                    {quotesLoading ? (
                      <p className="text-xs text-text-muted">Loading...</p>
                    ) : quotes.length === 0 ? (
                      <p className="text-xs text-text-muted">No quotes submitted yet.</p>
                    ) : (
                      quotes.map((q) => (
                        <QuoteCard
                          key={q.quote_id}
                          quote={q}
                          roomId={room.room_id}
                          onAction={handleQuoteAction}
                          isLoading={actionLoading === q.quote_id}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <CreateDealRoomDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        companies={companies}
        products={products}
        existingRoomCompanyIds={rooms.map((r) => r.company_id)}
      />

      {/* Edit dialog */}
      {editRoom && (
        <EditDealRoomDialog
          open={!!editRoom}
          onClose={() => setEditRoom(null)}
          room={editRoom}
          products={products}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quote card                                                          */
/* ------------------------------------------------------------------ */

const QUOTE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "bg-amber-500/15", text: "text-amber-500" },
  reviewed: { bg: "bg-blue-500/15", text: "text-blue-400" },
  accepted: { bg: "bg-status-green/15", text: "text-status-green" },
  declined: { bg: "bg-status-red/15", text: "text-status-red" },
  draft: { bg: "bg-white/10", text: "text-text-muted" },
};

function QuoteCard({
  quote,
  roomId,
  onAction,
  isLoading,
}: {
  quote: DealRoomQuote;
  roomId: string;
  onAction: (roomId: string, quoteId: string, status: QuoteStatus) => void;
  isLoading: boolean;
}) {
  const style = QUOTE_STATUS_STYLES[quote.status] ?? QUOTE_STATUS_STYLES.draft;
  const total = quote.total_price != null ? `$${Number(quote.total_price).toLocaleString()}` : "N/A";
  const items = (quote.selected_items ?? []) as { product_name: string; tier: string; subtotal: number }[];
  const canAct = quote.status === "submitted" || quote.status === "reviewed";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {quote.prospect_name || "Unknown prospect"}
          </p>
          <p className="text-xs text-text-muted truncate">
            {quote.prospect_email || "No email"}{quote.prospect_title ? ` · ${quote.prospect_title}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-text-primary">{total}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
            {quote.status}
          </span>
        </div>
      </div>
      {items.length > 0 && (
        <div className="text-xs text-text-muted space-y-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span className="truncate">{item.product_name} ({item.tier})</span>
              <span className="shrink-0 ml-2">${Number(item.subtotal).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {quote.prospect_notes && (
        <p className="text-xs text-text-muted italic">&quot;{quote.prospect_notes}&quot;</p>
      )}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>Submitted {formatDate(quote.submitted_at)}</span>
        {quote.reviewed_at && <span>· Reviewed {formatDate(quote.reviewed_at)}</span>}
      </div>
      {canAct && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onAction(roomId, quote.quote_id, "accepted")}
            disabled={isLoading}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onAction(roomId, quote.quote_id, "declined")}
            disabled={isLoading}
          >
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${
          accent ? "text-status-green" : "text-text-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
