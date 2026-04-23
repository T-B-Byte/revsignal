"use client";

import { useState } from "react";
import { ProductShowcase } from "./product-showcase";
import { QuoteBuilder } from "./quote-builder";
import { DataTestForm } from "./data-test-form";
import { DataCoverage } from "./data-coverage";
import { DpaDownload } from "./dpa-download";
import { TINA_CALENDAR_URL } from "@/types/database";

import type { DealRoomDemoSelection } from "@/types/database";

type Tab = "products" | "quote" | "data-test" | "dpa" | string;

const ALL_DEMOS: Record<string, { label: string; url: string }> = {
  daas_framework: { label: "Entire File", url: "https://revsignal.vercel.app/frameworks/daas-framework" },
  tal_matching: { label: "TAL Matching", url: "https://surgeengine.app/pricing/raw-data" },
};

// Demo tabs that always appear on every room, regardless of selected_demos.
const ALWAYS_ON_DEMOS = new Set(["tal_matching"]);

interface RoomContentProps {
  room: Record<string, unknown>;
  products: Record<string, unknown>[];
  slug: string;
  password: string;
}

export function RoomContent({ room, products, slug, password }: RoomContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  const company = room.gtm_company_profiles as {
    name: string;
    logo_url: string | null;
    description: string | null;
  } | null;

  const companyName = company?.name || "your company";
  const header = (room.custom_header as string) || `Built for ${companyName}`;
  const welcomeMessage = room.welcome_message as string | null;
  const showQuoteBuilder = room.show_quote_builder as boolean;
  const showAudienceDashboard = room.show_audience_dashboard as boolean;
  const audienceDashboardUrl = room.audience_dashboard_url as string | null;
  const accentColor = (room.accent_color as string) || "#22c55e";
  const customPricing = (room.custom_pricing as { label: string; price: string; unit: string; description: string }[]) || [];
  const customUseCases = (room.custom_use_cases as { title: string; description: string; persona?: string }[]) || [];
  const customUseCasesIntro = (room.custom_use_cases_intro as string | null) ?? null;
  const customWhyUs = (room.custom_why_us as { title: string; description: string }[]) || [];

  // Build active demos from selected_demos, falling back to all demos if none selected.
  // Always-on demos (e.g. TAL Matching) are appended for every room so new demos show up
  // even on rooms created before they existed.
  const selectedDemos = (room.selected_demos as DealRoomDemoSelection[]) || [];
  const selectedActive = selectedDemos.length > 0
    ? selectedDemos
        .filter((d) => d.demo_type in ALL_DEMOS)
        .map((d) => ({ key: d.demo_type, ...ALL_DEMOS[d.demo_type] }))
    : Object.entries(ALL_DEMOS)
        .filter(([key]) => !ALWAYS_ON_DEMOS.has(key))
        .map(([key, val]) => ({ key, ...val }));
  const alwaysOn = Array.from(ALWAYS_ON_DEMOS)
    .filter((key) => key in ALL_DEMOS && !selectedActive.some((d) => d.key === key))
    .map((key) => ({ key, ...ALL_DEMOS[key] }));
  const activeDemos = [...selectedActive, ...alwaysOn];

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "products", label: "Solutions", show: true },
    ...activeDemos.map((d) => ({ key: d.key, label: d.label, show: true })),
    { key: "quote", label: "Build a Quote", show: showQuoteBuilder },
    { key: "data-test", label: "Data Test Request", show: true },
    { key: "dpa", label: "DPA", show: true },
  ];

  return (
    <div className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 min-h-screen transition-colors ${t("bg-slate-900 text-zinc-100", "bg-zinc-50 text-zinc-900")}`}>
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4">
          {company?.logo_url ? (
            <img
              src={company.logo_url}
              alt={companyName}
              className="h-12 w-12 rounded-lg object-contain bg-white p-1"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className={`text-2xl font-bold ${t("text-zinc-100", "text-zinc-900")}`}>{header}</h1>
            {welcomeMessage && (
              <p className={`mt-1 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>{welcomeMessage}</p>
            )}
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`ml-auto rounded-full p-2 transition ${t("hover:bg-white/10", "hover:bg-black/10")}`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className={`mb-8 flex gap-1 overflow-x-auto rounded-lg p-1 scrollbar-none ${t("bg-slate-800", "bg-zinc-200")}`}>
        {tabs
          .filter((tb) => tb.show)
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? t("bg-zinc-800 text-zinc-100", "bg-white text-zinc-900 shadow-sm")
                  : t("text-zinc-400 hover:text-zinc-200", "text-zinc-500 hover:text-zinc-700")
              }`}
            >
              {tab.label}
            </button>
          ))}
      </nav>

      {/* Tab Content */}
      {activeTab === "products" && (
        <div className="space-y-8">
          {showAudienceDashboard && audienceDashboardUrl && (
            <section>
              <h2 className={`mb-4 text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>
                Audience Intelligence Dashboard
              </h2>
              <div className={`overflow-hidden rounded-xl border ${t("border-zinc-800", "border-zinc-200")}`}>
                <iframe
                  src={`${audienceDashboardUrl}${audienceDashboardUrl?.includes("?") ? "&" : "?"}theme=dark`}
                  className="h-[800px] w-full"
                  title="Audience Intelligence Dashboard"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </section>
          )}

          <ProductShowcase products={products} accentColor={accentColor} theme={theme} companyName={companyName} customUseCases={customUseCases} customUseCasesIntro={customUseCasesIntro} customWhyUs={customWhyUs} customPricing={customPricing} />

          <DataCoverage theme={theme} />
        </div>
      )}

      {activeTab === "quote" && showQuoteBuilder && (
        <QuoteBuilder
          products={products}
          slug={slug}
          password={password}
          theme={theme}
          customPricing={customPricing}
        />
      )}

      {/* Demo tabs */}
      {activeDemos.map((demo) =>
        activeTab === demo.key ? (
          <div key={demo.key} className={`overflow-hidden rounded-xl border ${t("border-zinc-800", "border-zinc-200")}`}>
            <iframe
              src={demo.url}
              className="h-[850px] w-full"
              title={demo.label}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : null
      )}

      {activeTab === "data-test" && (
        <DataTestForm slug={slug} password={password} theme={theme} />
      )}

      {activeTab === "dpa" && (
        <DpaDownload theme={theme} accentColor={accentColor} companyName={companyName} />
      )}

      {/* Footer */}
      <footer className={`mt-16 border-t pt-8 text-center ${t("border-zinc-800", "border-zinc-200")}`}>
        <p className={`text-sm ${t("text-zinc-400", "text-zinc-500")}`}>
          Ready to talk?{" "}
          <a
            href={TINA_CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium ${t("text-green-400 hover:text-green-300", "text-green-600 hover:text-green-500")}`}
          >
            Book a call with Tina
          </a>
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <img
            src={t("/PharosIQ Logo_pharosIQ-White Wordmark.svg", "/PharosIQ Logo_pharosIq-Full Color.svg")}
            alt="pharosIQ"
            className="h-5 w-auto opacity-40"
          />
        </div>
      </footer>
    </div>
  );
}
