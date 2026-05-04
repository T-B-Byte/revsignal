"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateDealRoomDialog } from "@/components/deal-rooms/create-deal-room-dialog";
import { EditDealRoomDialog } from "@/components/deal-rooms/edit-deal-room-dialog";
import type {
  DealRoomWithCompany,
  DealRoomStatus,
  DealRoomAccessLog,
  GtmCompanyProfile,
  GtmProduct,
  DealRoomQuote,
  QuoteStatus,
} from "@/types/database";

interface DealRoomsViewProps {
  rooms: DealRoomWithCompany[];
  companies: Pick<GtmCompanyProfile, "company_id" | "name" | "slug" | "logo_url">[];
  products: Pick<GtmProduct, "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type" | "use_cases">[];
}

const STATUS_STYLES: Record<DealRoomStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-white/10", text: "text-text-muted" },
  active: { bg: "bg-status-green/15", text: "text-status-green" },
  expired: { bg: "bg-status-red/15", text: "text-status-red" },
  archived: { bg: "bg-white/10", text: "text-text-muted" },
};

// Human-readable labels for tracked tab keys
const TAB_LABELS: Record<string, string> = {
  products: "Solutions",
  difference: "pharosIQ Difference",
  quote: "Build a Quote",
  "data-test": "Data Test",
  dpa: "DPA",
  downloads: "Downloads",
  daas_framework: "Entire File",
  tal_matching: "TAL Matching",
};

function tabLabel(key: string): string {
  return TAB_LABELS[key] ?? key;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // "Sent" state — persisted in localStorage, no DB needed
  const [sentRooms, setSentRooms] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("deal_room_sent") ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  // Access log popover state
  const [logPopoverRoomId, setLogPopoverRoomId] = useState<string | null>(null);
  const [logPopoverData, setLogPopoverData] = useState<DealRoomAccessLog[]>([]);
  const [logPopoverLoading, setLogPopoverLoading] = useState(false);

  function toggleSent(roomId: string) {
    setSentRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      localStorage.setItem("deal_room_sent", JSON.stringify([...next]));
      return next;
    });
  }

  async function handleOpenLogPopover(roomId: string) {
    if (logPopoverRoomId === roomId) {
      setLogPopoverRoomId(null);
      return;
    }
    setLogPopoverRoomId(roomId);
    setLogPopoverData([]);
    setLogPopoverLoading(true);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}/access-log`);
      if (res.ok) {
        const data = await res.json();
        setLogPopoverData(data.access_logs ?? []);
      }
    } finally {
      setLogPopoverLoading(false);
    }
  }

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (sortBy === "alpha") {
        const nameA = a.gtm_company_profiles?.name ?? "";
        const nameB = b.gtm_company_profiles?.name ?? "";
        return nameA.localeCompare(nameB);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rooms, sortBy]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.status === "active").length;
    const totalViews = rooms.reduce((sum, r) => sum + (r.view_count ?? 0), 0);
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
      // clipboard not available
    }
  }

  function handleOpenRoom(slug: string, password: string | null) {
    const url = password
      ? `/room/${slug}?pw=${encodeURIComponent(password)}`
      : `/room/${slug}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleToggleQuotes(roomId: string) {
    if (expandedQuotes === roomId) {
      setExpandedQuotes(null);
      return;
    }
    setExpandedQuotes(roomId);
    setQuotes([]);
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
      if (res.ok) router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClone(roomId: string) {
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}/clone`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(roomId: string, companyName: string) {
    if (!confirm(`Delete the deal room for ${companyName}? This cannot be undone.`)) return;
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
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
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Room list */}
      {rooms.length === 0 ? (
        <div className="rounded-xl border border-border-primary bg-surface-tertiary p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <svg className="h-6 w-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
        <div className="space-y-2">
          {/* Sort controls */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs text-text-muted">Sort:</span>
            <button
              onClick={() => setSortBy("recent")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === "recent"
                  ? "bg-white/10 text-text-primary font-medium"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy("alpha")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sortBy === "alpha"
                  ? "bg-white/10 text-text-primary font-medium"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Alphabetical
            </button>
          </div>

          {sortedRooms.map((room) => {
            const company = room.gtm_company_profiles;
            const companyName = company?.name ?? "Unknown Company";
            const logoUrl = room.company_logo_url ?? company?.logo_url;
            const statusStyle = STATUS_STYLES[room.status];
            const isLoading = actionLoading === room.room_id;
            const isSent = sentRooms.has(room.room_id);
            const isOpened = (room.view_count ?? 0) > 0;
            const openCount = room.view_count ?? 0;
            const isLogOpen = logPopoverRoomId === room.room_id;

            return (
              <div key={room.room_id} className="space-y-0">
                <div className="glass rounded-xl px-5 py-4 flex items-center gap-4 hover:border-white/20 transition-colors">
                  {/* Logo + Name */}
                  <div className="flex items-center gap-3 w-48 shrink-0 min-w-0">
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
                      <p className="text-sm font-semibold text-text-primary truncate">{companyName}</p>
                      <button
                        onClick={() => handleCopyLink(room.slug)}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-500 transition-colors cursor-pointer group"
                        title="Copy link"
                      >
                        <span className="truncate">/room/{room.slug}</span>
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

                  {/* Status */}
                  <div className="shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                      {room.status}
                    </span>
                  </div>

                  {/* Password */}
                  {room.password_plain ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 shrink-0">
                      <span className="text-[10px] uppercase text-text-muted font-medium tracking-wider">pw</span>
                      <code className="text-xs font-mono text-text-primary">{room.password_plain}</code>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(room.password_plain!);
                          setCopiedPassword(room.room_id);
                          setTimeout(() => setCopiedPassword(null), 2000);
                        }}
                        className="text-text-muted hover:text-brand-500 transition-colors cursor-pointer ml-0.5"
                        title="Copy password"
                      >
                        {copiedPassword === room.room_id ? (
                          <svg className="h-3 w-3 text-status-green" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 8.5l3 3 7-7" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="5" width="8" height="8" rx="1.5" />
                            <path d="M3 11V4a1.5 1.5 0 011.5-1.5H11" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0 w-28" />
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-text-muted flex-1 min-w-0">
                    <span className="shrink-0">{formatRelative(room.last_viewed_at)}</span>
                    <span className="shrink-0">{room.selected_products?.length ?? 0} products</span>
                    {room.expires_at && (
                      <span className="shrink-0">exp {formatDate(room.expires_at)}</span>
                    )}
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      {room.show_audience_dashboard && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-brand-500/15 text-brand-500 font-medium whitespace-nowrap">
                          Audience
                        </span>
                      )}
                      {room.show_quote_builder && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-brand-500/15 text-brand-500 font-medium whitespace-nowrap">
                          Quotes
                        </span>
                      )}
                      {room.accent_color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: room.accent_color }}
                          title="Custom color"
                        />
                      )}
                    </div>
                  </div>

                  {/* ── Sent column ── */}
                  <label className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium group-hover:text-text-secondary transition-colors">
                      Sent
                    </span>
                    <div
                      onClick={() => toggleSent(room.room_id)}
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        isSent
                          ? "bg-brand-500 border-brand-500"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      {isSent && (
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                        </svg>
                      )}
                    </div>
                  </label>

                  {/* ── Customer Opened column ── */}
                  <div className="flex flex-col items-center gap-1 shrink-0 relative">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                      Opened
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center ${
                          isOpened
                            ? "bg-status-green border-status-green"
                            : "border-white/20"
                        }`}
                      >
                        {isOpened && (
                          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                          </svg>
                        )}
                      </div>
                      <button
                        onDoubleClick={() => handleOpenLogPopover(room.room_id)}
                        title="Double-click to see open history"
                        className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded transition-colors cursor-pointer select-none ${
                          openCount > 0
                            ? "text-status-green bg-status-green/10 hover:bg-status-green/20"
                            : "text-text-muted"
                        }`}
                      >
                        {openCount}
                      </button>
                    </div>

                    {/* Access log popover */}
                    {isLogOpen && (
                      <AccessLogPopover
                        logs={logPopoverData}
                        loading={logPopoverLoading}
                        onClose={() => setLogPopoverRoomId(null)}
                      />
                    )}
                  </div>

                  {/* Primary actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleOpenRoom(room.slug, room.password_plain)}
                      disabled={isLoading}
                      title="Open deal room (auto-authenticated)"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" />
                        <path d="M10 2h4v4M14 2L7.5 8.5" />
                      </svg>
                      Open Room
                    </Button>
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

                    {/* More actions dropdown */}
                    <MoreMenu
                      open={openMenu === room.room_id}
                      onToggle={() => setOpenMenu(openMenu === room.room_id ? null : room.room_id)}
                      onClose={() => setOpenMenu(null)}
                    >
                      <MoreMenuItem onClick={() => { handleToggleQuotes(room.room_id); setOpenMenu(null); }}>
                        View Quotes
                      </MoreMenuItem>
                      <MoreMenuItem onClick={() => { handleClone(room.room_id); setOpenMenu(null); }} disabled={isLoading}>
                        Duplicate
                      </MoreMenuItem>
                      <MoreMenuItem onClick={() => { handleToggleStatus(room.room_id, room.status); setOpenMenu(null); }} disabled={isLoading}>
                        {room.status === "active" ? "Deactivate" : "Activate"}
                      </MoreMenuItem>
                      <MoreMenuItem
                        onClick={() => { handleDelete(room.room_id, companyName); setOpenMenu(null); }}
                        disabled={isLoading}
                        danger
                      >
                        Delete
                      </MoreMenuItem>
                    </MoreMenu>
                  </div>
                </div>

                {/* Quotes panel */}
                {expandedQuotes === room.room_id && (
                  <div className="mx-1 rounded-b-xl border border-t-0 border-white/[0.08] bg-white/[0.02] px-5 pt-4 pb-4 space-y-3">
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

      {showCreate && (
        <CreateDealRoomDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          companies={companies}
          products={products}
          existingRoomCompanyIds={rooms.map((r) => r.company_id)}
        />
      )}

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
/* Access log popover                                                  */
/* ------------------------------------------------------------------ */

function AccessLogPopover({
  logs,
  loading,
  onClose,
}: {
  logs: DealRoomAccessLog[];
  loading: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const totalTabClicks = logs.reduce((sum, l) => sum + (l.pages_viewed?.length ?? 0), 0);

  return (
    <div
      ref={ref}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-80 rounded-xl border border-white/[0.1] bg-surface-secondary shadow-2xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text-primary">Open History</p>
          {!loading && (
            <p className="text-[10px] text-text-muted mt-0.5">
              {logs.length} {logs.length === 1 ? "open" : "opens"}
              {totalTabClicks > 0 && ` · ${totalTabClicks} tab clicks`}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-6 text-xs text-text-muted text-center">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-xs text-text-muted text-center">No opens yet.</p>
        ) : (
          logs.map((log, i) => {
            const uniqueTabs = [...new Set(log.pages_viewed ?? [])];
            return (
              <div
                key={log.log_id}
                className={`px-4 py-3 ${i < logs.length - 1 ? "border-b border-white/[0.04]" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-text-primary font-medium">
                    {formatDateTime(log.accessed_at)}
                  </p>
                  {(log.pages_viewed?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-text-muted shrink-0">
                      {log.pages_viewed!.length} click{log.pages_viewed!.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {uniqueTabs.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {uniqueTabs.map((tab) => (
                      <span
                        key={tab}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-text-muted"
                      >
                        {tabLabel(tab)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-text-muted italic">No tabs tracked yet</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* More menu                                                           */
/* ------------------------------------------------------------------ */

function MoreMenu({
  open,
  onToggle,
  onClose,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors cursor-pointer"
        title="More actions"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="8" cy="13" r="1.25" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-white/[0.1] bg-surface-secondary shadow-xl py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function MoreMenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? "text-status-red hover:bg-status-red/10"
          : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
      }`}
    >
      {children}
    </button>
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
          <Button size="sm" onClick={() => onAction(roomId, quote.quote_id, "accepted")} disabled={isLoading}>
            Accept
          </Button>
          <Button size="sm" variant="danger" onClick={() => onAction(roomId, quote.quote_id, "declined")} disabled={isLoading}>
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

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-status-green" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
