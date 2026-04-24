"use client";

import { useState, useEffect } from "react";

interface Doc {
  id: string;
  title: string;
  description: string;
  url: string;
  password: string;
  category: string;
  created: string;
  archived?: boolean;
}

const DEFAULT_DOCS: Doc[] = [
  {
    id: "daas-framework",
    title: "DaaS Product Framework",
    description: "Tiered licensing model, surge product suite, target account matrix, and pipeline tracker. The master strategy doc for the Jeff/Chris/Marty alignment.",
    url: "https://revsignal.vercel.app/daas-framework.html",
    password: "daas-revenue-$$$",
    category: "Strategy",
    created: "2026-03-30",
  },
  {
    id: "daas-framework-v2",
    title: "DaaS Internal Pricing Reference",
    description: "Internal CFO-facing pricing document. All five products with actual prices, billing channels (Stripe vs. pharosIQ invoice), and workflow notes. Shared with Kristin and Jeff April 2026.",
    url: "https://revsignal.vercel.app/daas-framework-v2.html",
    password: "daas-revenue-$$$",
    category: "Strategy",
    created: "2026-04-13",
  },
  {
    id: "daas-go-to-market",
    title: "DaaS Go-to-Market",
    description: "Combined internal doc: all 5 products with pricing and billing channels, plus the live target account authorization matrix at the bottom. Matrix shares Supabase state with /matrix.html.",
    url: "https://revsignal.vercel.app/daas-go-to-market.html",
    password: "daas-revenue-$$$",
    category: "Strategy",
    created: "2026-04-23",
  },
  {
    id: "battlecards",
    title: "Competitive Battle Cards",
    description: "8 competitor battlecards for pharosIQ Lead Gen / Demand Gen sales team. Compares campaign delivery, lead quality, CPL, targeting precision, and signal provenance vs. DemandScience, Anteriad, Intentsify, TechTarget, Madison Logic, ProspectBase, DigitalZone, DemandWorks.",
    url: "https://revsignal.vercel.app/battlecards.html",
    password: "BattleCard1",
    category: "Competitive Intel",
    created: "2026-03-31",
  },
  {
    id: "ibm-framework",
    title: "IBM: DaaS Tiered Licensing Model",
    description: "Confidential pitch deck presenting pharosIQ's tiered DaaS licensing model prepared for IBM. Four tiers from Accounts+Intent ($48K) to Contacts+Content Enterprise ($2.4M+).",
    url: "https://revsignal.vercel.app/frameworks/ibm",
    password: "",
    category: "Strategy",
    created: "2026-04-06",
  },
  {
    id: "account-matrix",
    title: "Account Matrix",
    description: "Target account matrix standalone view. Shared Supabase state with the DaaS Framework doc.",
    url: "https://revsignal.vercel.app/matrix.html",
    password: "revenue2026",
    category: "Strategy",
    created: "2026-04-05",
  },
  {
    id: "daas-product-definition",
    title: "DaaS Product Definition (Legacy)",
    description: "Original contact vs. persona comparison doc. Superseded by the DaaS Framework but kept for reference.",
    url: "https://revsignal.vercel.app/daas-product-definition.html",
    password: "",
    category: "Strategy",
    created: "2026-03-28",
  },
  {
    id: "audience-dashboard",
    title: "Audience Dashboard",
    description: "SurgeEngine audience dashboard.",
    url: "https://surgeengine.app/audience-dashboard.html",
    password: "",
    category: "SurgeEngine",
    created: "2026-04-15",
  },
  {
    id: "integrate-field-analysis",
    title: "DB Field Analysis: New Field Candidates",
    description: "Database analysis and assessment of new fields to add to the pharosIQ data schema. Presented to Ben Luck (Chief Data Scientist).",
    url: "https://audience-dashboard-liard.vercel.app/Public/integrate-field-analysis.html",
    password: "",
    category: "Data",
    created: "2026-04-15",
  },
];

const STORAGE_KEY = "revsignal-docs";

function loadDocs(): Doc[] {
  if (typeof window === "undefined") return DEFAULT_DOCS;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const savedDocs: Doc[] = JSON.parse(saved);
      // Merge: add any new defaults missing from saved data
      const savedIds = new Set(savedDocs.map((d) => d.id));
      const newDocs = DEFAULT_DOCS.filter((d) => !savedIds.has(d.id));
      if (newDocs.length > 0) {
        const merged = [...savedDocs, ...newDocs];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return savedDocs;
    } catch {
      return DEFAULT_DOCS;
    }
  }
  return DEFAULT_DOCS;
}

function saveDocs(docs: Doc[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>(DEFAULT_DOCS);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  function updatePassword(id: string, newPassword: string) {
    const updated = docs.map((d) =>
      d.id === id ? { ...d, password: newPassword } : d
    );
    setDocs(updated);
    saveDocs(updated);
    setEditingPassword(null);
    setPasswordInput("");
  }

  function toggleArchive(id: string) {
    const updated = docs.map((d) =>
      d.id === id ? { ...d, archived: !d.archived } : d
    );
    setDocs(updated);
    saveDocs(updated);
  }

  function toggleShowPassword(id: string) {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const visibleDocs = showArchived ? docs : docs.filter((d) => !d.archived);
  const archivedCount = docs.filter((d) => d.archived).length;
  const categories = [...new Set(visibleDocs.map((d) => d.category))];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Strategy docs, frameworks, and shared artifacts. Password-protected for confidential distribution.
          </p>
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {category}
          </h2>
          <div className="space-y-4">
            {visibleDocs
              .filter((d) => d.category === category)
              .map((doc) => (
                <div
                  key={doc.id}
                  className={`border border-border rounded-lg bg-card p-5 ${doc.archived ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-foreground">
                          {doc.title}
                        </h3>
                        {doc.archived && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Archived
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {doc.created}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {doc.description}
                      </p>

                      {/* URL + Copy */}
                      <div className="flex items-center gap-2 mb-3">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-400 underline underline-offset-2 truncate"
                        >
                          {doc.url}
                        </a>
                        <button
                          onClick={() => copyLink(doc.url, doc.id)}
                          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 shrink-0"
                        >
                          {copied === doc.id ? "Copied!" : "Copy Link"}
                        </button>
                      </div>

                      {/* Password + Archive */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Password:
                          </span>
                          {editingPassword === doc.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="New password"
                                className="text-sm px-2 py-1 rounded border border-border bg-background text-foreground w-40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") updatePassword(doc.id, passwordInput);
                                  if (e.key === "Escape") { setEditingPassword(null); setPasswordInput(""); }
                                }}
                              />
                              <button
                                onClick={() => updatePassword(doc.id, passwordInput)}
                                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingPassword(null); setPasswordInput(""); }}
                                className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                {doc.password
                                  ? showPassword[doc.id]
                                    ? doc.password
                                    : "••••••••"
                                  : "None"}
                              </code>
                              {doc.password && (
                                <button
                                  onClick={() => toggleShowPassword(doc.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword[doc.id] ? "Hide" : "Show"}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingPassword(doc.id);
                                  setPasswordInput(doc.password);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Change
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleArchive(doc.id)}
                          className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                        >
                          {doc.archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </div>

                    {/* Open button */}
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
