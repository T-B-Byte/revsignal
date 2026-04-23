"use client";

import { useEffect, useState } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  data_feeds: "#4f6ef7",
  intelligence_reports: "#7c3aed",
  monitoring: "#f59e0b",
  data_products: "#10b981",
  platform: "#06b6d4",
};

const CATEGORY_VISUALS: Record<string, { title: string; color: string; bars: { label: string; percent: number }[] }> = {
  data_feeds: {
    title: "Signal Coverage by Vertical",
    color: "#4f6ef7",
    bars: [
      { label: "Technology", percent: 89 },
      { label: "Sales", percent: 82 },
      { label: "Marketing", percent: 78 },
      { label: "Finance", percent: 71 },
      { label: "Healthcare", percent: 64 },
      { label: "HR", percent: 58 },
    ],
  },
  intelligence_reports: {
    title: "Report Module Coverage",
    color: "#7c3aed",
    bars: [
      { label: "Buyer Overview", percent: 95 },
      { label: "Buying Committee", percent: 88 },
      { label: "Competitive Heat Map", percent: 82 },
      { label: "Outreach Scripts", percent: 79 },
      { label: "Call Prep", percent: 75 },
      { label: "Sentiment Analysis", percent: 68 },
    ],
  },
  monitoring: {
    title: "Intent Topic Categories",
    color: "#f59e0b",
    bars: [
      { label: "Cloud & Infrastructure", percent: 94 },
      { label: "Security & Compliance", percent: 91 },
      { label: "Marketing Technology", percent: 87 },
      { label: "Sales Technology", percent: 83 },
      { label: "HR Technology", percent: 76 },
      { label: "Healthcare IT", percent: 69 },
    ],
  },
  data_products: {
    title: "Title Variation Coverage by Region",
    color: "#10b981",
    bars: [
      { label: "North America (English)", percent: 97 },
      { label: "EMEA (12 languages)", percent: 89 },
      { label: "APAC (8 languages)", percent: 82 },
      { label: "LATAM (Spanish/Portuguese)", percent: 78 },
    ],
  },
  platform: {
    title: "Platform Module Readiness",
    color: "#06b6d4",
    bars: [
      { label: "Surge Dossier Generator", percent: 100 },
      { label: "Surge Trending", percent: 95 },
      { label: "ICP Analyzer", percent: 90 },
      { label: "Title Expansion", percent: 88 },
      { label: "Surge Radar", percent: 85 },
      { label: "Self-Service Portal", percent: 80 },
    ],
  },
};

const STAGGER_MS = 80;
const BASE_DELAY_MS = 120;

function ProductVisualBar({
  label,
  percent,
  index,
  animate,
  color,
  theme,
}: {
  label: string;
  percent: number;
  index: number;
  animate: boolean;
  color: string;
  theme: "dark" | "light";
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      setWidth(percent);
    }, BASE_DELAY_MS + index * STAGGER_MS);
    return () => clearTimeout(timer);
  }, [animate, percent, index]);

  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className={`text-xs ${t("text-zinc-300", "text-zinc-600")}`}>{label}</span>
        <span className={`font-mono text-xs font-semibold ${t("text-zinc-400", "text-zinc-500")}`}>
          {percent}%
        </span>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${t("bg-white/[0.08]", "bg-zinc-100")}`}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

function ProductVisuals({
  category,
  theme,
}: {
  category: string;
  theme: "dark" | "light";
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const visuals = CATEGORY_VISUALS[category];
  if (!visuals) return null;

  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  return (
    <div
      className={`mb-6 rounded-lg border p-4 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
      style={{ borderTopColor: visuals.color, borderTopWidth: "2px" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: visuals.color }}
        />
        <h4 className={`text-sm font-semibold ${t("text-zinc-200", "text-zinc-800")}`}>
          {visuals.title}
        </h4>
      </div>
      <div className="space-y-2.5">
        {visuals.bars.map((bar, i) => (
          <ProductVisualBar
            key={bar.label}
            label={bar.label}
            percent={bar.percent}
            index={i}
            animate={animate}
            color={visuals.color}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

interface CustomUseCase {
  title: string;
  description: string;
  persona?: string;
}

interface CustomWhyUs {
  title: string;
  description: string;
}

interface CustomPricing {
  label: string;
  price: string;
  unit: string;
  description: string;
}

interface ProductShowcaseProps {
  products: Record<string, unknown>[];
  accentColor: string;
  theme?: "dark" | "light";
  companyName?: string;
  customUseCases?: CustomUseCase[];
  customUseCasesIntro?: string | null;
  customWhyUs?: CustomWhyUs[];
  customPricing?: CustomPricing[];
}

export function ProductShowcase({ products, accentColor, theme = "dark", companyName, customUseCases = [], customUseCasesIntro = null, customWhyUs = [], customPricing = [] }: ProductShowcaseProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  if (products.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${t("border-slate-700 bg-slate-800", "border-zinc-200 bg-white shadow-sm")}`}>
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
        const category = product.category as string | undefined;
        const categoryColor = category ? CATEGORY_COLORS[category] : undefined;
        const customNotes = (product.custom_notes as string | null) || null;
        const slug = product.slug as string | undefined;
        const isJobson = slug === "jobson-title-expansion";

        return (
          <div
            key={id}
            className={`overflow-hidden rounded-xl border transition ${t("border-slate-700 bg-slate-800 hover:border-slate-600", "border-zinc-200 bg-white hover:border-zinc-300 shadow-sm")}`}
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
              <div className={`border-t p-6 pt-4 ${t("border-slate-700", "border-zinc-200")}`}>
                {/* Per-room custom note: how this fits the prospect */}
                {customNotes && (
                  <div
                    className={`mb-6 rounded-lg border p-4 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
                    style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }}
                  >
                    <p
                      className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: accentColor }}
                    >
                      {companyName ? `How this fits ${companyName}` : "How this fits"}
                    </p>
                    <p className={`text-sm leading-relaxed ${t("text-zinc-200", "text-zinc-800")}`}>
                      {customNotes}
                    </p>
                  </div>
                )}

                {/* Data Highlights Visualization (Jobson gets a live demo iframe instead) */}
                {isJobson ? (
                  <div
                    className={`mb-6 overflow-hidden rounded-lg border ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
                    style={{ borderTopColor: CATEGORY_COLORS.data_products, borderTopWidth: "2px" }}
                  >
                    <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${t("bg-slate-900", "bg-zinc-50")}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS.data_products }}
                        />
                        <h4 className={`text-sm font-semibold ${t("text-zinc-200", "text-zinc-800")}`}>
                          Live Title Expansion Demo
                        </h4>
                      </div>
                      <a
                        href="https://surgeengine.app/title-expansion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-medium underline-offset-2 hover:underline ${t("text-zinc-400", "text-zinc-500")}`}
                      >
                        Open in new tab
                      </a>
                    </div>
                    <iframe
                      src="https://surgeengine.app/title-expansion"
                      title="Jobson Title Expansion Demo"
                      loading="lazy"
                      className="block h-[720px] w-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                ) : (
                  category && <ProductVisuals category={category} theme={theme} />
                )}

                {/* Key Stats */}
                {keyStats.length > 0 && (
                  <div className="mb-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {keyStats.map((stat, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
                          style={categoryColor ? { borderLeftColor: categoryColor, borderLeftWidth: "3px" } : undefined}
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
                        <div key={i} className={`rounded-lg border p-3 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}>
                          {categoryColor && (
                            <div className="mb-2 h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} />
                          )}
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
                        <div key={i} className={`rounded-lg border p-3 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}>
                          <p
                            className="text-xs font-medium"
                            style={categoryColor ? { color: categoryColor } : undefined}
                          >vs. {d.vs_competitor}</p>
                          <p className={`mt-1 text-sm ${t("text-zinc-300", "text-zinc-700")}`}>{d.advantage}</p>
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

      {/* Custom Use Cases (room-level, set by Tina) */}
      {customUseCases.length > 0 && (
        <div className={`mt-6 rounded-xl border p-6 ${t("border-slate-700 bg-slate-800", "border-zinc-200 bg-white shadow-sm")}`}>
          <h3 className={`mb-2 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
            Use Cases
          </h3>
          {customUseCasesIntro && (
            <p className={`mb-4 text-sm leading-relaxed ${t("text-zinc-400", "text-zinc-500")}`}>
              {customUseCasesIntro}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customUseCases.map((uc, i) => (
              <div key={i} className={`rounded-lg border p-4 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}>
                <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>{uc.title}</p>
                <p className={`mt-1 text-xs leading-relaxed ${t("text-zinc-400", "text-zinc-500")}`}>{uc.description}</p>
                {uc.persona && (
                  <p className={`mt-2 text-xs ${t("text-zinc-600", "text-zinc-400")}`}>For: {uc.persona}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Why Us (room-level, set by Tina) */}
      {customWhyUs.length > 0 && (
        <div className={`mt-6 rounded-xl border p-6 ${t("border-slate-700 bg-slate-800", "border-zinc-200 bg-white shadow-sm")}`}>
          <h3 className={`mb-4 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
            Why Us
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {customWhyUs.map((w, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
                style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }}
              >
                <p className={`text-sm font-semibold ${t("text-zinc-200", "text-zinc-800")}`}>{w.title}</p>
                <p className={`mt-1 text-xs leading-relaxed ${t("text-zinc-400", "text-zinc-500")}`}>{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Pricing (room-level, set by Tina) */}
      {customPricing.length > 0 && (
        <div className={`mt-6 rounded-xl border p-6 ${t("border-slate-700 bg-slate-800", "border-zinc-200 bg-white shadow-sm")}`}>
          <h3 className={`mb-4 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
            Pricing
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customPricing.map((tier, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${t("border-slate-700 bg-slate-900", "border-zinc-200 bg-zinc-50")}`}
              >
                <p className={`text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>{tier.label}</p>
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
  );
}
