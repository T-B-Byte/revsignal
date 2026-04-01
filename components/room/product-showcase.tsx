"use client";

import { useState } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  data_feeds: "#4f6ef7",
  intelligence_reports: "#7c3aed",
  monitoring: "#f59e0b",
  data_products: "#10b981",
  platform: "#06b6d4",
};

interface ProductShowcaseProps {
  products: Record<string, unknown>[];
  accentColor: string;
  theme?: "dark" | "light";
}

export function ProductShowcase({ products, accentColor, theme = "dark" }: ProductShowcaseProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  if (products.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <p className={t("text-zinc-400", "text-zinc-500")}>No products configured for this deal room yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => {
        const id = product.product_id as string;
        const isExpanded = expandedId === id;
        const features = (product.features as { name: string; description: string }[]) || [];
        const benefits = (product.benefits as { benefit: string; for_whom?: string }[]) || [];
        const useCases = (product.use_cases as { title: string; description: string; persona?: string }[]) || [];
        const keyStats = (product.key_stats as { stat: string; source?: string }[]) || [];
        const differentiators = (product.differentiators as { vs_competitor: string; advantage: string }[]) || [];
        const pricingTiers = (product.pricing_tiers as Record<string, { price: string; unit: string; description: string }>) || {};
        const category = product.category as string | undefined;
        const categoryColor = category ? CATEGORY_COLORS[category] : undefined;

        return (
          <div
            key={id}
            className={`overflow-hidden rounded-xl border transition ${t("border-zinc-800 bg-zinc-900 hover:border-zinc-700", "border-zinc-200 bg-white hover:border-zinc-300 shadow-sm")}`}
            style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
          >
            {/* Product Header (always visible) */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : id)}
              className="flex w-full items-start justify-between p-6 text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {(product.name as string)?.charAt(0)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
                        {product.name as string}
                      </h3>
                      {categoryColor && (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                          style={{ backgroundColor: categoryColor }}
                        >
                          {(category || "").replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${t("text-zinc-400", "text-zinc-500")}`}>{product.tagline as string}</p>
                  </div>
                </div>
                <p className={`mt-3 text-sm leading-relaxed ${t("text-zinc-300", "text-zinc-700")}`}>
                  {product.value_prop as string}
                </p>
              </div>
              <svg
                className={`ml-4 mt-1 h-5 w-5 flex-shrink-0 text-zinc-500 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className={`border-t p-6 pt-4 ${t("border-zinc-800", "border-zinc-200")}`}>
                {/* Key Stats */}
                {keyStats.length > 0 && (
                  <div className="mb-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {keyStats.map((stat, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${t("border-zinc-800 bg-zinc-950", "border-zinc-200 bg-zinc-50")}`}
                        >
                          <p className={`text-sm font-medium ${t("text-zinc-100", "text-zinc-900")}`}>{stat.stat}</p>
                          {stat.source && (
                            <p className={`mt-1 text-xs ${t("text-zinc-500", "text-zinc-400")}`}>Source: {stat.source}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {features.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Features
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {features.map((f, i) => (
                        <div key={i} className="flex gap-2">
                          <svg
                            className="mt-0.5 h-4 w-4 flex-shrink-0"
                            style={{ color: accentColor }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div>
                            <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>{f.name}</p>
                            <p className={`text-xs ${t("text-zinc-500", "text-zinc-400")}`}>{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {useCases.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Use Cases
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {useCases.map((uc, i) => (
                        <div key={i} className={`rounded-lg border p-3 ${t("border-zinc-800 bg-zinc-950", "border-zinc-200 bg-zinc-50")}`}>
                          <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>{uc.title}</p>
                          <p className={`mt-1 text-xs ${t("text-zinc-500", "text-zinc-400")}`}>{uc.description}</p>
                          {uc.persona && (
                            <p className={`mt-2 text-xs ${t("text-zinc-600", "text-zinc-400")}`}>For: {uc.persona}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {benefits.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Benefits
                    </h4>
                    <ul className="space-y-2">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span style={{ color: accentColor }}>+</span>
                          <span className={t("text-zinc-300", "text-zinc-700")}>
                            {b.benefit}
                            {b.for_whom && (
                              <span className={t("text-zinc-500", "text-zinc-400")}> ({b.for_whom})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Differentiators */}
                {differentiators.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Why Us
                    </h4>
                    <div className="space-y-2">
                      {differentiators.map((d, i) => (
                        <div key={i} className={`rounded-lg border p-3 ${t("border-zinc-800 bg-zinc-950", "border-zinc-200 bg-zinc-50")}`}>
                          <p className={`text-xs font-medium ${t("text-zinc-500", "text-zinc-400")}`}>vs. {d.vs_competitor}</p>
                          <p className={`mt-1 text-sm ${t("text-zinc-300", "text-zinc-700")}`}>{d.advantage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                {Object.keys(pricingTiers).length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Pricing
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(pricingTiers).map(([tierName, tier]) => (
                        <div
                          key={tierName}
                          className={`rounded-lg border p-4 ${t("border-zinc-800 bg-zinc-950", "border-zinc-200 bg-zinc-50")}`}
                        >
                          <p className={`text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>{tierName}</p>
                          <p className="mt-1 text-lg font-bold" style={{ color: accentColor }}>
                            {tier.price}
                            <span className={`text-sm font-normal ${t("text-zinc-500", "text-zinc-400")}`}>
                              {tier.unit}
                            </span>
                          </p>
                          <p className={`mt-1 text-xs ${t("text-zinc-500", "text-zinc-400")}`}>{tier.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
