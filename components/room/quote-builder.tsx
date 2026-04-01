"use client";

import { useState, useMemo } from "react";
import { TINA_CALENDAR_URL } from "@/types/database";

interface QuoteLineItem {
  product_id: string;
  product_name: string;
  tier: string;
  unit_price: number;
  subtotal: number;
}

interface QuoteBuilderProps {
  products: Record<string, unknown>[];
  slug: string;
  password: string;
  theme?: "dark" | "light";
}

export function QuoteBuilder({ products, slug, password, theme = "dark" }: QuoteBuilderProps) {
  const t = (dark: string, light: string) => theme === "dark" ? dark : light;
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectTitle, setProspectTitle] = useState("");
  const [prospectNotes, setProspectNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  function addItem(product: Record<string, unknown>, tierName: string, tierData: { price: string; unit: string }) {
    // Parse price: extract numeric value from strings like "$100K-200K", "$500", "$0.01-0.05"
    const priceStr = tierData.price.replace(/[^0-9.,KkMm-]/g, "");
    let numericPrice = 0;
    const parts = priceStr.split("-");
    const firstPart = parts[0].replace(/,/g, "");
    if (firstPart.toLowerCase().endsWith("k")) {
      numericPrice = parseFloat(firstPart) * 1000;
    } else if (firstPart.toLowerCase().endsWith("m")) {
      numericPrice = parseFloat(firstPart) * 1000000;
    } else {
      numericPrice = parseFloat(firstPart) || 0;
    }

    const newItem: QuoteLineItem = {
      product_id: product.product_id as string,
      product_name: product.name as string,
      tier: tierName,
      unit_price: numericPrice,
      subtotal: numericPrice,
    };

    setItems((prev) => [...prev, newItem]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (items.length === 0) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/room/${encodeURIComponent(slug)}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          selected_items: items,
          total_price: total,
          prospect_name: prospectName || undefined,
          prospect_email: prospectEmail || undefined,
          prospect_title: prospectTitle || undefined,
          prospect_notes: prospectNotes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit quote");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Connection error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={`rounded-xl border p-8 text-center ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-green-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className={`text-xl font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Quote Submitted</h2>
        <p className={`mt-2 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>
          We&apos;ll review your selections and get back to you shortly.
        </p>
        <a
          href={TINA_CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Book a Follow-Up Call
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Cards with Inline Tier Selection */}
      <div className="space-y-4">
        <h2 className={`text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Select Products and Tiers</h2>
        {products.map((product) => {
          const tiers = (product.pricing_tiers as Record<string, { price: string; unit: string; description: string }>) || {};
          if (Object.keys(tiers).length === 0) return null;

          const features = (product.features as { name: string; description: string }[]) || [];
          const tagline = product.tagline as string | null;
          const addedTiers = items
            .filter((i) => i.product_id === (product.product_id as string))
            .map((i) => i.tier);

          return (
            <div
              key={product.product_id as string}
              className={`rounded-xl border overflow-hidden ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}
            >
              {/* Product header */}
              <div className="p-5">
                <h3 className={`text-base font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
                  {product.name as string}
                </h3>
                {tagline && (
                  <p className={`mt-1 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>{tagline}</p>
                )}

                {/* Key features (compact, 2-col) */}
                {features.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {features.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <svg className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-xs ${t("text-zinc-300", "text-zinc-600")}`}>{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tier selection */}
              <div className={`border-t px-5 py-4 ${t("border-zinc-800 bg-zinc-950/50", "border-zinc-100 bg-zinc-50")}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${t("text-zinc-500", "text-zinc-400")}`}>
                  Select a tier to add
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(tiers).map(([tierName, tierData]) => {
                    const isAdded = addedTiers.includes(tierName);
                    return (
                      <button
                        key={tierName}
                        onClick={() => !isAdded && addItem(product, tierName, tierData)}
                        disabled={isAdded}
                        className={`rounded-lg border p-3 text-left transition ${
                          isAdded
                            ? "border-green-500/30 bg-green-500/10 cursor-default"
                            : t(
                                "border-zinc-700 bg-zinc-900 hover:border-green-500 hover:bg-green-500/5 cursor-pointer",
                                "border-zinc-300 bg-white hover:border-green-500 hover:bg-green-50 cursor-pointer"
                              )
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>{tierName}</span>
                          {isAdded && (
                            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm font-mono font-semibold text-green-500 mt-1">
                          {tierData.price}<span className={`font-normal text-xs ${t("text-zinc-500", "text-zinc-400")}`}>{tierData.unit}</span>
                        </p>
                        <p className={`text-xs mt-1 ${t("text-zinc-500", "text-zinc-400")}`}>{tierData.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quote Summary */}
      {items.length > 0 && (
        <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
          <h2 className={`mb-4 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Your Quote</h2>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${t("border-zinc-800 bg-zinc-950", "border-zinc-200 bg-zinc-50")}`}>
                <div>
                  <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>{item.product_name}</p>
                  <p className={`text-xs ${t("text-zinc-500", "text-zinc-400")}`}>{item.tier}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-mono font-medium text-green-400">
                    ${item.subtotal.toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeItem(i)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-4 flex items-center justify-between border-t pt-4 ${t("border-zinc-800", "border-zinc-200")}`}>
            <p className={`text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>Estimated Total</p>
            <p className="text-lg font-mono font-bold text-green-400">
              ${total.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Contact Info + Submit */}
      {items.length > 0 && (
        <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
          <h2 className={`mb-4 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Your Information (Optional)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              maxLength={200}
              className={`rounded-lg border px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
            />
            <input
              type="email"
              placeholder="Email"
              value={prospectEmail}
              onChange={(e) => setProspectEmail(e.target.value)}
              maxLength={200}
              className={`rounded-lg border px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
            />
            <input
              type="text"
              placeholder="Title"
              value={prospectTitle}
              onChange={(e) => setProspectTitle(e.target.value)}
              maxLength={200}
              className={`rounded-lg border px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
            />
            <textarea
              placeholder="Notes (e.g., interested in a pilot, specific use case)"
              value={prospectNotes}
              onChange={(e) => setProspectNotes(e.target.value)}
              maxLength={2000}
              rows={2}
              className={`rounded-lg border px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none sm:col-span-2 ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Quote Request"}
          </button>
        </div>
      )}
    </div>
  );
}
