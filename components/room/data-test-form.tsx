"use client";

import { useState, FormEvent } from "react";

interface DataTestFormProps {
  slug: string;
  password: string;
  theme?: "dark" | "light";
}

export function DataTestForm({ slug, password, theme = "dark" }: DataTestFormProps) {
  const t = (dark: string, light: string) => theme === "dark" ? dark : light;
  const [domainsText, setDomainsText] = useState("");
  const [scope, setScope] = useState<"personas_intent" | "full_schema">("personas_intent");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ domain_count: number; scope: string } | null>(null);
  const [error, setError] = useState("");

  // Parse domains from text area (one per line, comma-separated, or space-separated)
  function parseDomains(): string[] {
    return domainsText
      .split(/[\n,\s]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0 && d.includes("."));
  }

  const domains = parseDomains();
  const domainCount = domains.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (domainCount === 0 || domainCount > 100) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/room/${encodeURIComponent(slug)}/data-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          domains,
          scope,
          prospect_name: prospectName || undefined,
          prospect_email: prospectEmail || undefined,
          prospect_company: prospectCompany || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit data test");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      setResult(data.test);
      setSubmitted(true);
    } catch {
      setError("Connection error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted && result) {
    return (
      <div className={`rounded-xl border p-8 text-center ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-green-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className={`text-xl font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Data Test Submitted</h2>
        <p className={`mt-2 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>
          {result.domain_count} domain{result.domain_count !== 1 ? "s" : ""} submitted for a{" "}
          {result.scope === "full_schema" ? "full schema" : "standard"} data test.
        </p>
        {result.scope === "full_schema" && (
          <p className="mt-2 text-sm text-amber-400">
            Full schema tests require approval. We&apos;ll notify you when your results are ready.
          </p>
        )}
        {result.scope === "personas_intent" && (
          <p className={`mt-2 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>
            We&apos;ll process your domains and share results shortly.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Explainer */}
      <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <h2 className={`text-lg font-semibold ${t("text-zinc-100", "text-zinc-900")}`}>Request a Data Test</h2>
        <p className={`mt-2 text-sm ${t("text-zinc-400", "text-zinc-500")}`}>
          Upload up to 100 company domains and we&apos;ll show you what our data looks like for your
          target accounts. Standard tests include persona matches and intent topic coverage.
        </p>
      </div>

      {/* Domain Input */}
      <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <label className={`mb-2 block text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>
          Company Domains
          <span className={`ml-2 text-xs ${t("text-zinc-500", "text-zinc-400")}`}>
            ({domainCount}/100, one per line)
          </span>
        </label>
        <textarea
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
          rows={8}
          placeholder={"acme.com\nglobex.corp\ninitec.com\nsoylent.co"}
          className={`w-full rounded-lg border px-4 py-3 font-mono text-sm focus:border-green-500 focus:outline-none ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-600", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
        />
        {domainCount > 100 && (
          <p className="mt-1 text-sm text-red-400">Maximum 100 domains. You have {domainCount}.</p>
        )}
      </div>

      {/* Scope Selection */}
      <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <label className={`mb-3 block text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>Test Scope</label>
        <div className="space-y-3">
          <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${t("border-zinc-800 bg-zinc-950 hover:border-zinc-700", "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}`}>
            <input
              type="radio"
              name="scope"
              value="personas_intent"
              checked={scope === "personas_intent"}
              onChange={() => setScope("personas_intent")}
              className="mt-0.5 accent-green-500"
            />
            <div>
              <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>Standard: Personas + Intent Topics</p>
              <p className={`text-xs ${t("text-zinc-500", "text-zinc-400")}`}>
                See which personas and intent topics we have for your target accounts. Auto-approved.
              </p>
            </div>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${t("border-zinc-800 bg-zinc-950 hover:border-zinc-700", "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}`}>
            <input
              type="radio"
              name="scope"
              value="full_schema"
              checked={scope === "full_schema"}
              onChange={() => setScope("full_schema")}
              className="mt-0.5 accent-green-500"
            />
            <div>
              <p className={`text-sm font-medium ${t("text-zinc-200", "text-zinc-800")}`}>Full Schema: All Fields</p>
              <p className="text-xs text-amber-400">
                Complete data output including all contact fields. Requires approval (typically 1 business day).
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Contact Info */}
      <div className={`rounded-xl border p-6 ${t("border-zinc-800 bg-zinc-900", "border-zinc-200 bg-white shadow-sm")}`}>
        <label className={`mb-3 block text-sm font-medium ${t("text-zinc-300", "text-zinc-700")}`}>
          Your Information (Optional)
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
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
            placeholder="Company"
            value={prospectCompany}
            onChange={(e) => setProspectCompany(e.target.value)}
            maxLength={200}
            className={`rounded-lg border px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none ${t("border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500", "border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400")}`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || domainCount === 0 || domainCount > 100}
        className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Submitting..."
          : `Submit Data Test (${domainCount} domain${domainCount !== 1 ? "s" : ""})`}
      </button>
    </form>
  );
}
