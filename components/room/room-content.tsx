"use client";

import { useState } from "react";
import { ProductShowcase } from "./product-showcase";
import { QuoteBuilder } from "./quote-builder";
import { DataTestForm } from "./data-test-form";
import { TINA_CALENDAR_URL } from "@/types/database";

type Tab = "products" | "quote" | "data-test";

interface RoomContentProps {
  room: Record<string, unknown>;
  products: Record<string, unknown>[];
  slug: string;
  password: string;
}

export function RoomContent({ room, products, slug, password }: RoomContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("products");

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

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "products", label: "Solutions", show: true },
    { key: "quote", label: "Build a Quote", show: showQuoteBuilder },
    { key: "data-test", label: "Data Test", show: true },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="text-2xl font-bold text-zinc-100">{header}</h1>
            {welcomeMessage && (
              <p className="mt-1 text-sm text-zinc-400">{welcomeMessage}</p>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="mb-8 flex gap-1 rounded-lg bg-zinc-900 p-1">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
      </nav>

      {/* Tab Content */}
      {activeTab === "products" && (
        <div className="space-y-8">
          <ProductShowcase products={products} accentColor={accentColor} />

          {showAudienceDashboard && audienceDashboardUrl && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Audience Intelligence Dashboard
              </h2>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <iframe
                  src={audienceDashboardUrl}
                  className="h-[600px] w-full"
                  title="Audience Intelligence Dashboard"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "quote" && showQuoteBuilder && (
        <QuoteBuilder
          products={products}
          slug={slug}
          password={password}
        />
      )}

      {activeTab === "data-test" && (
        <DataTestForm slug={slug} password={password} />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-800 pt-8 text-center">
        <p className="text-sm text-zinc-400">
          Ready to talk?{" "}
          <a
            href={TINA_CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-green-400 hover:text-green-300"
          >
            Book a call with Tina
          </a>
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Powered by pharosIQ Data Solutions
        </p>
      </footer>
    </div>
  );
}
