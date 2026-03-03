/**
 * pharosIQ Intent Signals CSV Ingestion Pipeline
 *
 * Parses weekly intent signals CSV exports from pharosIQ,
 * normalizes data, matches to existing prospects and deals,
 * flags surge signals, and updates Prospect Scout targets.
 *
 * CSV format expected:
 *   Company, Domain, Intent Category, Intent Score, Surge Score,
 *   First Seen, Last Seen, Signal Sources
 *
 * Used by: api/ingest/intent-signals-csv (weekly upload)
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────

export interface IntentSignalRow {
  company: string;
  domain: string | null;
  intentCategory: string;
  intentScore: number;
  surgeScore: number | null;
  firstSeen: string;
  lastSeen: string;
  signalSources: string[];
}

export interface CsvIngestResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  signalsStored: number;
  surgeSignals: number;
  matchedToDeals: number;
  matchedToProspects: number;
  newProspectSuggestions: number;
  errors: string[];
}

export interface ParsedCsvRow {
  company?: string;
  domain?: string;
  intent_category?: string;
  intentCategory?: string;
  intent_score?: string;
  intentScore?: string;
  surge_score?: string;
  surgeScore?: string;
  first_seen?: string;
  firstSeen?: string;
  last_seen?: string;
  lastSeen?: string;
  signal_sources?: string;
  signalSources?: string;
  [key: string]: string | undefined;
}

// ── CSV Parser ────────────────────────────────────────────────────────

/**
 * Parse a CSV string into structured intent signal rows.
 * Handles both comma and tab delimiters.
 * Normalizes column headers (case-insensitive, underscore/space tolerant).
 */
export function parseCsv(csvText: string): {
  rows: IntentSignalRow[];
  errors: string[];
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must have a header row and at least one data row"] };
  }

  // Detect delimiter
  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  // Parse header — normalize to camelCase
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const headerMap = normalizeHeaders(rawHeaders);

  const rows: IntentSignalRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCsvLine(line, delimiter);
      const record: ParsedCsvRow = {};
      rawHeaders.forEach((_, idx) => {
        const key = headerMap[idx];
        if (key) record[key] = values[idx]?.trim();
      });

      const company = record.company;
      if (!company) {
        errors.push(`Row ${i + 1}: Missing company name`);
        continue;
      }

      const intentScore = parseFloat(
        record.intentScore ?? record.intent_score ?? "0"
      );
      if (isNaN(intentScore)) {
        errors.push(`Row ${i + 1}: Invalid intent score`);
        continue;
      }

      const surgeScoreRaw = record.surgeScore ?? record.surge_score;
      const surgeScore = surgeScoreRaw ? parseFloat(surgeScoreRaw) : null;

      rows.push({
        company,
        domain: record.domain || null,
        intentCategory: record.intentCategory ?? record.intent_category ?? "Unknown",
        intentScore,
        surgeScore: surgeScore !== null && !isNaN(surgeScore) ? surgeScore : null,
        firstSeen: record.firstSeen ?? record.first_seen ?? new Date().toISOString(),
        lastSeen: record.lastSeen ?? record.last_seen ?? new Date().toISOString(),
        signalSources: (record.signalSources ?? record.signal_sources ?? "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } catch (error) {
      errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : "Parse error"}`
      );
    }
  }

  return { rows, errors };
}

// ── Ingestion ─────────────────────────────────────────────────────────

/**
 * Ingest parsed intent signals into the database.
 * Matches to existing deals and prospects, flags surges.
 */
export async function ingestIntentSignals(
  supabase: SupabaseClient,
  userId: string,
  signals: IntentSignalRow[]
): Promise<CsvIngestResult> {
  const result: CsvIngestResult = {
    totalRows: signals.length,
    validRows: signals.length,
    invalidRows: 0,
    signalsStored: 0,
    surgeSignals: 0,
    matchedToDeals: 0,
    matchedToProspects: 0,
    newProspectSuggestions: 0,
    errors: [],
  };

  // Load existing deals and prospects for matching
  const [dealsResult, prospectsResult] = await Promise.all([
    supabase
      .from("deals")
      .select("deal_id, company")
      .eq("user_id", userId),
    supabase
      .from("prospects")
      .select("id, company")
      .eq("user_id", userId),
  ]);

  const dealsByCompany = new Map(
    ((dealsResult.data as { deal_id: string; company: string }[]) ?? []).map(
      (d) => [d.company.toLowerCase(), d.deal_id]
    )
  );

  const prospectsByCompany = new Set(
    ((prospectsResult.data as { id: string; company: string }[]) ?? []).map(
      (p) => p.company.toLowerCase()
    )
  );

  for (const signal of signals) {
    try {
      const companyLower = signal.company.toLowerCase();
      const isSurge = signal.surgeScore !== null && signal.surgeScore > 1.5;

      // Store signal in ingested_messages for audit trail
      await supabase.from("ingested_messages").insert({
        user_id: userId,
        source: "pharosiq-intent-csv",
        external_id: `${signal.company}:${signal.intentCategory}:${signal.lastSeen}`,
        raw_content: JSON.stringify(signal),
        processed: true,
        matched_deal_id: dealsByCompany.get(companyLower) ?? null,
        processed_at: new Date().toISOString(),
      });

      result.signalsStored++;

      if (isSurge) {
        result.surgeSignals++;
      }

      // Match to existing deal
      if (dealsByCompany.has(companyLower)) {
        result.matchedToDeals++;
      }

      // Match to existing prospect
      if (prospectsByCompany.has(companyLower)) {
        result.matchedToProspects++;
      }

      // Flag as new prospect suggestion if surge + no existing deal or prospect
      if (
        isSurge &&
        !dealsByCompany.has(companyLower) &&
        !prospectsByCompany.has(companyLower) &&
        signal.intentScore >= 50
      ) {
        // Create prospect suggestion
        await supabase.from("prospects").insert({
          user_id: userId,
          company: signal.company,
          website: signal.domain ? `https://${signal.domain}` : null,
          source: "pharosiq-intent-csv",
          research_notes: `Surge signal detected: ${signal.intentCategory} (score: ${signal.intentScore}, surge: ${signal.surgeScore}x). Sources: ${signal.signalSources.join(", ")}`,
          last_researched_date: new Date().toISOString(),
          contacts: [],
        });

        prospectsByCompany.add(companyLower);
        result.newProspectSuggestions++;
      }
    } catch (error) {
      result.errors.push(
        `${signal.company}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Log ingestion activity
  await supabase.from("agent_logs").insert({
    user_id: userId,
    agent_name: "prospect-scout",
    action: "intent_csv_ingested",
    input_context: {
      totalSignals: result.totalRows,
      surgeSignals: result.surgeSignals,
    },
    output: `Ingested ${result.signalsStored} signals (${result.surgeSignals} surges). Matched ${result.matchedToDeals} to deals, ${result.matchedToProspects} to prospects. ${result.newProspectSuggestions} new prospect suggestions.`,
    sources_cited: ["pharosiq-intent-csv"],
    tokens_used: null,
  });

  return result;
}

// ── Full CSV Pipeline ────────────────────────────────────────────────

/**
 * Full pipeline: parse CSV text → ingest signals → return results.
 */
export async function processIntentCsv(
  supabase: SupabaseClient,
  userId: string,
  csvText: string
): Promise<CsvIngestResult> {
  const { rows, errors: parseErrors } = parseCsv(csvText);

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: parseErrors.length,
      signalsStored: 0,
      surgeSignals: 0,
      matchedToDeals: 0,
      matchedToProspects: 0,
      newProspectSuggestions: 0,
      errors: parseErrors,
    };
  }

  const result = await ingestIntentSignals(supabase, userId, rows);
  result.invalidRows = parseErrors.length;
  result.errors = [...parseErrors, ...result.errors];

  return result;
}

// ── CSV Parsing Utilities ────────────────────────────────────────────

/** Parse a single CSV line, handling quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

/** Normalize CSV headers to camelCase keys */
function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => {
    const normalized = h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, "")
      .replace(/[\s_]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toLowerCase());

    // Map common variations
    const mappings: Record<string, string> = {
      company: "company",
      companyName: "company",
      domain: "domain",
      companyDomain: "domain",
      intentCategory: "intentCategory",
      category: "intentCategory",
      intentScore: "intentScore",
      score: "intentScore",
      surgeScore: "surgeScore",
      surge: "surgeScore",
      firstSeen: "firstSeen",
      lastSeen: "lastSeen",
      signalSources: "signalSources",
      sources: "signalSources",
    };

    return mappings[normalized] ?? normalized;
  });
}
