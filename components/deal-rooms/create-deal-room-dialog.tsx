"use client";

import { useState, useEffect } from "react";
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
import type { GtmCompanyProfile, GtmProduct, DealRoomCustomPricing, DealRoomCustomUseCase } from "@/types/database";

interface CreateDealRoomDialogProps {
  open: boolean;
  onClose: () => void;
  companies: Pick<GtmCompanyProfile, "company_id" | "name" | "slug" | "logo_url">[];
  products: Pick<GtmProduct, "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type">[];
  existingRoomCompanyIds?: string[];
}

function slugify(name: string): string {
  const now = new Date();
  const monthYear = now
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toLowerCase()
    .replace(/\s+/g, "-");
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${monthYear}`;
}

function generatePassword(): string {
  const intentWords = [
    "surge", "intent", "signal", "persona", "funnel", "pipeline",
    "inmarket", "topical", "firmographic", "technographic",
    "bombora", "bidstream", "cohort", "propensity", "lookalike",
  ];
  const schemaWords = [
    "contact", "account", "domain", "seniority", "vertical",
    "taxonomy", "segment", "enrichment", "webhook", "schema",
    "dataset", "payload", "record", "field", "index",
  ];
  const marktechWords = [
    "nurture", "retarget", "syndicate", "lifecycle", "attribution",
    "qualified", "MQL", "ABM", "CPL", "TAM", "ICP",
    "programmatic", "demand", "conversion", "outbound",
  ];
  const pools = [intentWords, schemaWords, marktechWords];
  const pool1 = pools[Math.floor(Math.random() * pools.length)];
  const pool2 = pools[Math.floor(Math.random() * pools.length)];
  const w1 = pool1[Math.floor(Math.random() * pool1.length)];
  const w2 = pool2[Math.floor(Math.random() * pool2.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${w1}-${w2}-${num}`;
}

function generateWelcome(companyName: string, productNames: string[]): string {
  const productList = productNames.length > 0
    ? `We've put together a curated package including ${productNames.join(", ")} based on what we think fits ${companyName} best.`
    : `We've put together a curated data solutions package tailored to ${companyName}.`;
  return `Welcome to your personalized pharosIQ deal room. ${productList} Explore the solutions below, build a quote, or request a data test to see our coverage for your target accounts.`;
}

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

export function CreateDealRoomDialog({
  open,
  onClose,
  companies,
  products,
  existingRoomCompanyIds = [],
}: CreateDealRoomDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick-add company state
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyWhy, setNewCompanyWhy] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [customHeader, setCustomHeader] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showAudienceDashboard, setShowAudienceDashboard] = useState(true);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(true);
  const [accentColor, setAccentColor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [customPricing, setCustomPricing] = useState<DealRoomCustomPricing[]>([]);
  const [customUseCases, setCustomUseCases] = useState<DealRoomCustomUseCase[]>([]);

  // Auto-generate slug, password, and welcome message when company changes
  useEffect(() => {
    if (!companyId) {
      setSlug("");
      return;
    }
    const company = companies.find((c) => c.company_id === companyId);
    if (company) {
      setSlug(slugify(company.name));
      setPassword(generatePassword());
      setCustomHeader(`Built for ${company.name}`);
      const selectedProductNames = products
        .filter((p) => selectedProducts.includes(p.product_id))
        .map((p) => p.name);
      setWelcomeMessage(generateWelcome(company.name, selectedProductNames));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, companies]);

  async function handleAddCompany() {
    if (!newCompanyName.trim()) return;
    setAddingCompany(true);
    try {
      const slug = newCompanyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const res = await fetch("/api/gtm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          slug,
          website: newCompanyWebsite.trim() || null,
          why_they_need_us: newCompanyWhy.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to add company");
        setAddingCompany(false);
        return;
      }
      const data = await res.json();
      const newId = data.company?.company_id;
      if (newId) {
        setCompanyId(newId);
        // Refresh the page to pick up the new company in the list
        router.refresh();
      }
      setShowAddCompany(false);
      setNewCompanyName("");
      setNewCompanyWebsite("");
      setNewCompanyWhy("");
    } catch {
      setError("Failed to add company");
    } finally {
      setAddingCompany(false);
    }
  }

  function resetForm() {
    setCompanyId("");
    setSlug("");
    setPassword("");
    setWelcomeMessage("");
    setCustomHeader("");
    setSelectedProducts([]);
    setShowAudienceDashboard(false);
    setShowQuoteBuilder(true);
    setAccentColor("");
    setExpiresAt("");
    setCustomPricing([]);
    setCustomUseCases([]);
    setError(null);
    setShowAddCompany(false);
    setNewCompanyName("");
    setNewCompanyWebsite("");
    setNewCompanyWhy("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

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

    if (!companyId) {
      setError("Please select a company.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }
    if (slug.trim().length > 100) {
      setError("Slug must be 100 characters or fewer.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    if (password.trim().length > 128) {
      setError("Password must be 128 characters or fewer.");
      return;
    }
    if (welcomeMessage.length > 2000) {
      setError("Welcome message must be 2000 characters or fewer.");
      return;
    }
    if (customHeader.length > 200) {
      setError("Header text must be 200 characters or fewer.");
      return;
    }
    if (selectedProducts.length === 0) {
      setError("Select at least one product.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        company_id: companyId,
        slug: slug.trim(),
        password: password.trim(),
        welcome_message: welcomeMessage.trim() || null,
        custom_header: customHeader.trim() || null,
        selected_products: selectedProducts.map((id, i) => ({
          product_id: id,
          display_order: i,
        })),
        show_audience_dashboard: showAudienceDashboard,
        show_quote_builder: showQuoteBuilder,
        accent_color: accentColor || null,
        expires_at: expiresAt || null,
        custom_pricing: customPricing.filter((p) => p.label.trim()),
        custom_use_cases: customUseCases.filter((uc) => uc.title.trim()),
      };

      const res = await fetch("/api/deal-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed to create deal room (${res.status})`);
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const existingSet = new Set(existingRoomCompanyIds);
  const companyOptions = companies.map((c) => ({
    value: c.company_id,
    label: existingSet.has(c.company_id) ? `✓ ${c.name}` : c.name,
  }));

  const accentOptions = ACCENT_COLORS.map((c) => ({
    value: c.value,
    label: c.label,
  }));

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Deal Room</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
         <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
              {error}
            </div>
          )}

          {/* Company + Quick Add */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Company</label>
              <button
                type="button"
                onClick={() => setShowAddCompany(!showAddCompany)}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                {showAddCompany ? "Cancel" : "+ Add new company"}
              </button>
            </div>

            {showAddCompany ? (
              <div className="space-y-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Company name"
                  required
                />
                <Input
                  value={newCompanyWebsite}
                  onChange={(e) => setNewCompanyWebsite(e.target.value)}
                  placeholder="https://example.com (optional)"
                />
                <Input
                  value={newCompanyWhy}
                  onChange={(e) => setNewCompanyWhy(e.target.value)}
                  placeholder="Why they need pharosIQ data (optional)"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCompany}
                  loading={addingCompany}
                  disabled={!newCompanyName.trim()}
                >
                  Add Company
                </Button>
              </div>
            ) : (
              <Select
                options={companyOptions}
                placeholder="Select a company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              />
            )}
          </div>

          <Input
            label="Room Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g., rollworks-apr-2026"
            helperText={slug ? `URL: /room/${slug}` : "Auto-generated from company name"}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Password</label>
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Visitors will enter this to access the room"
                className="flex-1 font-mono"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPassword(generatePassword())}
                className="shrink-0 text-xs"
              >
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-text-muted">Share this with the prospect. You can view it later from the room card.</p>
          </div>

          {/* Optional fields */}
          <Input
            label="Custom Header Text"
            value={customHeader}
            onChange={(e) => setCustomHeader(e.target.value)}
            placeholder="e.g., Prepared for the RollWorks team"
            helperText="Appears at the top of the deal room (optional)"
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Welcome Message</label>
              <button
                type="button"
                onClick={() => {
                  const company = companies.find((c) => c.company_id === companyId);
                  if (company) {
                    const names = products.filter((p) => selectedProducts.includes(p.product_id)).map((p) => p.name);
                    setWelcomeMessage(generateWelcome(company.name, names));
                  }
                }}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Auto-generate
              </button>
            </div>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="A brief welcome message shown after login..."
              rows={3}
            />
          </div>

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
            {products.length === 0 ? (
              <p className="text-xs text-text-muted">
                No products found. Add products in the GTM Command Center first.
              </p>
            ) : (
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
                          <svg
                            className="h-3 w-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {product.name}
                        </p>
                        {product.tagline && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                            {product.tagline}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-secondary">
              Room Features
            </label>
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
              <p className="text-xs text-text-muted">No pricing set. Prospects will see a &quot;Request a Quote&quot; form instead. You can add pricing later.</p>
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
            {customUseCases.length === 0 && (
              <p className="text-xs text-text-muted">No custom use cases. You can add them later to display in the prospect&apos;s deal room.</p>
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

          {/* Accent color + expiration */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Accent Color"
              options={accentOptions}
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">
                Expiration Date
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm text-text-body bg-white/[0.07] border border-white/15 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
              <p className="text-xs text-text-muted">Optional. Room expires at end of day.</p>
            </div>
          </div>

          </div>

          {/* Submit - pinned to bottom */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Deal Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle row                                                          */
/* ------------------------------------------------------------------ */

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
