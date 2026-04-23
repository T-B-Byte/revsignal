"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DealRoomWithCompany, GtmProduct, DealRoomStatus, DealRoomCustomPricing, DealRoomCustomUseCase, DealRoomCustomWhyUs, DemoType, DealRoomDemoSelection } from "@/types/database";

interface EditDealRoomDialogProps {
  open: boolean;
  onClose: () => void;
  room: DealRoomWithCompany;
  products: Pick<GtmProduct, "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type">[];
}

const AVAILABLE_DEMOS: { demo_type: DemoType; label: string; description: string }[] = [
  { demo_type: "daas_framework", label: "DaaS Framework", description: "Tiered data product framework" },
];

const ACCENT_COLORS = [
  { value: "", label: "Default (Brand)" },
  { value: "#4f6ef7", label: "Blue" },
  { value: "#7c3aed", label: "Purple" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ef4444", label: "Red" },
  { value: "#ec4899", label: "Pink" },
];

const STATUS_OPTIONS: { value: DealRoomStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

export function EditDealRoomDialog({
  open,
  onClose,
  room,
  products,
}: EditDealRoomDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyName = room.gtm_company_profiles?.name ?? "Unknown";

  // Form state initialized from room
  const [status, setStatus] = useState<DealRoomStatus>(room.status);
  const [password, setPassword] = useState(room.password_plain ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(room.welcome_message ?? "");
  const [customHeader, setCustomHeader] = useState(room.custom_header ?? "");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    (room.selected_products ?? []).map((p) => p.product_id)
  );
  // Preserve any per-product custom_notes set outside this UI (e.g. via script).
  const initialNotesByProductId = new Map<string, string>(
    (room.selected_products ?? [])
      .filter((p) => typeof (p as { custom_notes?: unknown }).custom_notes === "string" && (p as { custom_notes?: string }).custom_notes!.trim().length > 0)
      .map((p) => [p.product_id, (p as { custom_notes: string }).custom_notes])
  );
  const [showAudienceDashboard, setShowAudienceDashboard] = useState(room.show_audience_dashboard);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(room.show_quote_builder);
  const [accentColor, setAccentColor] = useState(room.accent_color ?? "");
  const [expiresAt, setExpiresAt] = useState(
    room.expires_at ? room.expires_at.split("T")[0] : ""
  );
  const [customPricing, setCustomPricing] = useState<DealRoomCustomPricing[]>(
    (room.custom_pricing as DealRoomCustomPricing[]) ?? []
  );
  const [customUseCases, setCustomUseCases] = useState<DealRoomCustomUseCase[]>(
    (room.custom_use_cases as DealRoomCustomUseCase[]) ?? []
  );
  const [customUseCasesIntro, setCustomUseCasesIntro] = useState<string>(
    (room.custom_use_cases_intro as string | null) ?? ""
  );
  const [customWhyUs, setCustomWhyUs] = useState<DealRoomCustomWhyUs[]>(
    (room.custom_why_us as DealRoomCustomWhyUs[]) ?? []
  );
  const [selectedDemos, setSelectedDemos] = useState<DemoType[]>(() => {
    const demos = (room.selected_demos as DealRoomDemoSelection[]) ?? [];
    const allowed = new Set(AVAILABLE_DEMOS.map((d) => d.demo_type));
    const filtered = demos.map((d) => d.demo_type).filter((t) => allowed.has(t));
    return filtered.length > 0 ? filtered : AVAILABLE_DEMOS.map((d) => d.demo_type);
  });

  function handleProductToggle(productId: string) {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedProducts.length === 0) {
      setError("Select at least one product.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        status,
        custom_header: customHeader.trim() || null,
        welcome_message: welcomeMessage.trim() || null,
        selected_products: selectedProducts.map((id, i) => {
          const note = initialNotesByProductId.get(id);
          return note
            ? { product_id: id, display_order: i, custom_notes: note }
            : { product_id: id, display_order: i };
        }),
        selected_demos: selectedDemos.map((dt) => ({ demo_type: dt })),
        show_audience_dashboard: showAudienceDashboard,
        show_quote_builder: showQuoteBuilder,
        accent_color: accentColor || null,
        expires_at: expiresAt || null,
        custom_pricing: customPricing.filter((p) => p.label.trim()),
        custom_use_cases: customUseCases.filter((uc) => uc.title.trim()),
        custom_use_cases_intro: customUseCasesIntro.trim() || null,
        custom_why_us: customWhyUs.filter((w) => w.title.trim()),
      };

      // Only include password if changed from stored value
      if (password && password !== room.password_plain) {
        body.password = password;
      }

      const res = await fetch(`/api/deal-rooms/${room.room_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed to update deal room (${res.status})`);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Deal Room: {companyName}</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
         <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
              {error}
            </div>
          )}

          {/* Status */}
          <Select
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(e) => setStatus(e.target.value as DealRoomStatus)}
          />

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Password</label>
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Room password"
                className="flex-1 font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (password) {
                    await navigator.clipboard.writeText(password);
                  }
                }}
                className="shrink-0 text-xs"
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-text-muted">Change the password or copy the current one to share.</p>
          </div>

          {/* Header + welcome */}
          <Input
            label="Custom Header Text"
            value={customHeader}
            onChange={(e) => setCustomHeader(e.target.value)}
            placeholder="e.g., Prepared for the RollWorks team"
          />

          <Textarea
            label="Welcome Message"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="A brief welcome message shown after login..."
            rows={3}
          />

          {/* Product selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">
                Products to Include
              </label>
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedProducts(
                      selectedProducts.length === products.length
                        ? []
                        : products.map((p) => p.product_id)
                    )
                  }
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  {selectedProducts.length === products.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.map((product) => {
                const isSelected = selectedProducts.includes(product.product_id);
                return (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => handleProductToggle(product.product_id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "border-brand-500/50 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-brand-500 bg-brand-500"
                          : "border-white/20 bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{product.name}</p>
                      {product.tagline && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{product.tagline}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-secondary">Room Features</label>
            <ToggleRow
              label="Show Audience Dashboard"
              description="Include the interactive audience intelligence dashboard"
              checked={showAudienceDashboard}
              onChange={setShowAudienceDashboard}
            />
            <ToggleRow
              label="Show Quote Builder"
              description="Let prospects build and submit a custom quote"
              checked={showQuoteBuilder}
              onChange={setShowQuoteBuilder}
            />
            <div className="pt-2">
              <p className="text-xs text-text-muted mb-2">Demo Tabs</p>
              {AVAILABLE_DEMOS.map((demo) => (
                <ToggleRow
                  key={demo.demo_type}
                  label={demo.label}
                  description={demo.description}
                  checked={selectedDemos.includes(demo.demo_type)}
                  onChange={(checked) =>
                    setSelectedDemos((prev) =>
                      checked
                        ? [...prev, demo.demo_type]
                        : prev.filter((d) => d !== demo.demo_type)
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Custom Pricing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Custom Pricing</label>
              <button
                type="button"
                onClick={() => setCustomPricing((prev) => [...prev, { label: "", price: "", unit: "", description: "" }])}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                + Add tier
              </button>
            </div>
            {customPricing.length === 0 && (
              <p className="text-xs text-text-muted">No pricing set. Prospects will see a &quot;Request a Quote&quot; form instead.</p>
            )}
            {customPricing.map((tier, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <Input
                  value={tier.label}
                  onChange={(e) => {
                    const next = [...customPricing];
                    next[i] = { ...next[i], label: e.target.value };
                    setCustomPricing(next);
                  }}
                  placeholder="Tier name (e.g., Standard OEM)"
                />
                <Input
                  value={tier.price}
                  onChange={(e) => {
                    const next = [...customPricing];
                    next[i] = { ...next[i], price: e.target.value };
                    setCustomPricing(next);
                  }}
                  placeholder="Price (e.g., $100K)"
                />
                <Input
                  value={tier.unit}
                  onChange={(e) => {
                    const next = [...customPricing];
                    next[i] = { ...next[i], unit: e.target.value };
                    setCustomPricing(next);
                  }}
                  placeholder="Unit (e.g., /year)"
                />
                <div className="col-span-2">
                  <Input
                    value={tier.description}
                    onChange={(e) => {
                      const next = [...customPricing];
                      next[i] = { ...next[i], description: e.target.value };
                      setCustomPricing(next);
                    }}
                    placeholder="Description"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomPricing((prev) => prev.filter((_, j) => j !== i))}
                  className="self-center text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Custom Use Cases */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Custom Use Cases</label>
              <button
                type="button"
                onClick={() => setCustomUseCases((prev) => [...prev, { title: "", description: "", persona: "" }])}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                + Add use case
              </button>
            </div>
            <Textarea
              value={customUseCasesIntro}
              onChange={(e) => setCustomUseCasesIntro(e.target.value)}
              placeholder="Optional lead-in above the use cases (e.g. 'Suggested based on the prospect's current product direction.')"
              rows={2}
            />
            {customUseCases.length === 0 && (
              <p className="text-xs text-text-muted">No custom use cases. Add use cases to display in the prospect&apos;s deal room.</p>
            )}
            {customUseCases.map((uc, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <Input
                  value={uc.title}
                  onChange={(e) => {
                    const next = [...customUseCases];
                    next[i] = { ...next[i], title: e.target.value };
                    setCustomUseCases(next);
                  }}
                  placeholder="Use case title"
                />
                <button
                  type="button"
                  onClick={() => setCustomUseCases((prev) => prev.filter((_, j) => j !== i))}
                  className="self-center text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
                <div className="col-span-2">
                  <Textarea
                    value={uc.description}
                    onChange={(e) => {
                      const next = [...customUseCases];
                      next[i] = { ...next[i], description: e.target.value };
                      setCustomUseCases(next);
                    }}
                    placeholder="Description of this use case"
                    rows={2}
                  />
                </div>
                <Input
                  value={uc.persona ?? ""}
                  onChange={(e) => {
                    const next = [...customUseCases];
                    next[i] = { ...next[i], persona: e.target.value };
                    setCustomUseCases(next);
                  }}
                  placeholder="Persona (optional, e.g., VP Marketing)"
                />
              </div>
            ))}
          </div>

          {/* Custom Why Us */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Why Us (Positive framing only)</label>
              <button
                type="button"
                onClick={() => setCustomWhyUs((prev) => [...prev, { title: "", description: "" }])}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                + Add statement
              </button>
            </div>
            {customWhyUs.length === 0 && (
              <p className="text-xs text-text-muted">No custom Why Us statements. Add positioning statements without comparative framing.</p>
            )}
            {customWhyUs.map((w, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <Input
                  value={w.title}
                  onChange={(e) => {
                    const next = [...customWhyUs];
                    next[i] = { ...next[i], title: e.target.value };
                    setCustomWhyUs(next);
                  }}
                  placeholder="Why us title"
                />
                <button
                  type="button"
                  onClick={() => setCustomWhyUs((prev) => prev.filter((_, j) => j !== i))}
                  className="self-center text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
                <div className="col-span-2">
                  <Textarea
                    value={w.description}
                    onChange={(e) => {
                      const next = [...customWhyUs];
                      next[i] = { ...next[i], description: e.target.value };
                      setCustomWhyUs(next);
                    }}
                    placeholder="Supporting statement"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Accent color + expiration */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Accent Color"
              options={ACCENT_COLORS.map((c) => ({ value: c.value, label: c.label }))}
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Expiration Date</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm text-text-body bg-white/[0.07] border border-white/15 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>
          </div>

          </div>

          {/* Submit - pinned to bottom */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/20 cursor-pointer"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand-500" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
