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
}

export function QuoteBuilder({ products, slug, password }: QuoteBuilderProps) {
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-green-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Quote Submitted</h2>
        <p className="mt-2 text-sm text-zinc-400">
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
      {/* Product Selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Add Products to Quote</h2>
        <div className="space-y-3">
          {products.map((product) => {
            const tiers = (product.pricing_tiers as Record<string, { price: string; unit: string; description: string }>) || {};
            if (Object.keys(tiers).length === 0) return null;

            return (
              <div key={product.product_id as string} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 font-medium text-zinc-200">{product.name as string}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tiers).map(([tierName, tierData]) => (
                    <button
                      key={tierName}
                      onClick={() => addItem(product, tierName, tierData)}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-green-600 hover:text-green-400"
                    >
                      {tierName}: {tierData.price}{tierData.unit}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Summary */}
      {items.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Your Quote</h2>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.product_name}</p>
                  <p className="text-xs text-zinc-500">{item.tier}</p>
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

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <p className="text-sm font-medium text-zinc-300">Estimated Total</p>
            <p className="text-lg font-mono font-bold text-green-400">
              ${total.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Contact Info + Submit */}
      {items.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Your Information (Optional)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              maxLength={200}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={prospectEmail}
              onChange={(e) => setProspectEmail(e.target.value)}
              maxLength={200}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Title"
              value={prospectTitle}
              onChange={(e) => setProspectTitle(e.target.value)}
              maxLength={200}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
            <textarea
              placeholder="Notes (e.g., interested in a pilot, specific use case)"
              value={prospectNotes}
              onChange={(e) => setProspectNotes(e.target.value)}
              maxLength={2000}
              rows={2}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none sm:col-span-2"
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
