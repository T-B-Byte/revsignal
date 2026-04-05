/**
 * pharosIQ Contacts DB Integration — Read-Only Contact & Intent Data Access
 *
 * Provides access to pharosIQ's proprietary business contacts database
 * (360M+ contacts, 650+ intent categories) and weekly intent signal data.
 * Used by: Prospect Scout, Strategist, Email Composer
 *
 * Auth: API key-based (server-to-server)
 * Access: Read-only — RevSignal never writes to pharosIQ's data
 *
 * Graceful degradation:
 *  - Every function returns a discriminated union: { source: "pharosiq", data } | { source: "manual", data }
 *  - Callers always get a valid shape — never an exception for API downtime
 */

// ── Configuration ─────────────────────────────────────────────────────

interface PharosIQConfig {
  baseUrl: string;
  apiKey: string;
}

function getPharosIQConfig(): PharosIQConfig | null {
  const apiKey = process.env.PHAROSIQ_API_KEY;
  const baseUrl = process.env.PHAROSIQ_DB_URL;

  if (!apiKey || !baseUrl) return null;

  return { apiKey, baseUrl };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface PharosIQContact {
  contactId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string | null;
  company: string;
  companyDomain: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  companySize: string | null;
  companyRevenue: string | null;
  lastUpdated: string;
}

export interface PharosIQCompany {
  companyId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  revenue: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  description: string | null;
}

export interface IntentSignal {
  signalId: string;
  company: string;
  companyDomain: string | null;
  intentCategory: string;
  intentScore: number; // 0-100
  surgeScore: number | null; // Multiplier vs baseline, null if no surge
  firstSeen: string;
  lastSeen: string;
  signalSources: string[];
}

export interface IntentCategory {
  categoryId: string;
  name: string;
  description: string | null;
  parentCategory: string | null;
}

export interface ContactSearchParams {
  company?: string;
  domain?: string;
  title?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

export interface IntentSearchParams {
  company?: string;
  domain?: string;
  category?: string;
  minScore?: number;
  surgeOnly?: boolean;
  since?: string;
  limit?: number;
  offset?: number;
}

/** Discriminated union for graceful degradation */
export type PharosIQResult<T> =
  | { source: "pharosiq"; data: T; error?: undefined }
  | { source: "manual"; data: T; error: string };

/** Integration health status */
export type IntegrationHealth = "active" | "degraded" | "disconnected";

// ── Core API Caller ───────────────────────────────────────────────────

/**
 * Make an authenticated request to the pharosIQ API.
 */
async function pharosiqFetch<T>(
  config: PharosIQConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `pharosIQ API ${response.status}: ${response.statusText} — ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Integration Health ────────────────────────────────────────────────

/**
 * Check pharosIQ integration health.
 */
export async function checkHealth(): Promise<IntegrationHealth> {
  const config = getPharosIQConfig();
  if (!config) return "disconnected";

  try {
    await pharosiqFetch(config, "/health");
    return "active";
  } catch {
    return "degraded";
  }
}

// ── Contact Search ────────────────────────────────────────────────────

/**
 * Search pharosIQ contacts database by company, title, location, etc.
 */
export async function searchContacts(
  params: ContactSearchParams
): Promise<PharosIQResult<PharosIQContact[]>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: [],
      error:
        "pharosIQ API not configured. Add contacts manually or check environment variables.",
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (params.company) queryParams.set("company", params.company);
    if (params.domain) queryParams.set("domain", params.domain);
    if (params.title) queryParams.set("title", params.title);
    if (params.industry) queryParams.set("industry", params.industry);
    if (params.city) queryParams.set("city", params.city);
    if (params.state) queryParams.set("state", params.state);
    if (params.country) queryParams.set("country", params.country);
    queryParams.set("limit", String(params.limit ?? 25));
    if (params.offset) queryParams.set("offset", String(params.offset));

    const result = await pharosiqFetch<{
      contacts: Array<{
        contact_id: string;
        first_name: string;
        last_name: string;
        full_name: string;
        title: string | null;
        company: string;
        company_domain: string | null;
        email: string | null;
        phone: string | null;
        linkedin_url: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        industry: string | null;
        company_size: string | null;
        company_revenue: string | null;
        last_updated: string;
      }>;
      total: number;
    }>(config, `/contacts/search?${queryParams}`);

    const contacts: PharosIQContact[] = result.contacts.map((c) => ({
      contactId: c.contact_id,
      firstName: c.first_name,
      lastName: c.last_name,
      fullName: c.full_name,
      title: c.title,
      company: c.company,
      companyDomain: c.company_domain,
      email: c.email,
      phone: c.phone,
      linkedinUrl: c.linkedin_url,
      city: c.city,
      state: c.state,
      country: c.country,
      industry: c.industry,
      companySize: c.company_size,
      companyRevenue: c.company_revenue,
      lastUpdated: c.last_updated,
    }));

    return { source: "pharosiq", data: contacts };
  } catch (error) {
    logDegraded("search-contacts", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to search pharosIQ contacts. Add contacts manually.",
    };
  }
}

/**
 * Get a single contact by ID.
 */
export async function getContactById(
  contactId: string
): Promise<PharosIQResult<PharosIQContact | null>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: null,
      error: "pharosIQ API not configured.",
    };
  }

  try {
    const c = await pharosiqFetch<{
      contact_id: string;
      first_name: string;
      last_name: string;
      full_name: string;
      title: string | null;
      company: string;
      company_domain: string | null;
      email: string | null;
      phone: string | null;
      linkedin_url: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      industry: string | null;
      company_size: string | null;
      company_revenue: string | null;
      last_updated: string;
    }>(config, `/contacts/${contactId}`);

    return {
      source: "pharosiq",
      data: {
        contactId: c.contact_id,
        firstName: c.first_name,
        lastName: c.last_name,
        fullName: c.full_name,
        title: c.title,
        company: c.company,
        companyDomain: c.company_domain,
        email: c.email,
        phone: c.phone,
        linkedinUrl: c.linkedin_url,
        city: c.city,
        state: c.state,
        country: c.country,
        industry: c.industry,
        companySize: c.company_size,
        companyRevenue: c.company_revenue,
        lastUpdated: c.last_updated,
      },
    };
  } catch (error) {
    logDegraded("get-contact", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch contact from pharosIQ.",
    };
  }
}

// ── Company Lookup ────────────────────────────────────────────────────

/**
 * Look up a company by name or domain.
 */
export async function lookupCompany(
  identifier: { name?: string; domain?: string }
): Promise<PharosIQResult<PharosIQCompany | null>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: null,
      error: "pharosIQ API not configured.",
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (identifier.name) queryParams.set("name", identifier.name);
    if (identifier.domain) queryParams.set("domain", identifier.domain);

    const result = await pharosiqFetch<{
      company: {
        company_id: string;
        name: string;
        domain: string | null;
        industry: string | null;
        employee_count: number | null;
        revenue: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        description: string | null;
      } | null;
    }>(config, `/companies/lookup?${queryParams}`);

    if (!result.company) {
      return { source: "pharosiq", data: null };
    }

    return {
      source: "pharosiq",
      data: {
        companyId: result.company.company_id,
        name: result.company.name,
        domain: result.company.domain,
        industry: result.company.industry,
        employeeCount: result.company.employee_count,
        revenue: result.company.revenue,
        city: result.company.city,
        state: result.company.state,
        country: result.company.country,
        description: result.company.description,
      },
    };
  } catch (error) {
    logDegraded("lookup-company", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to look up company in pharosIQ.",
    };
  }
}

// ── Intent Signals ────────────────────────────────────────────────────

/**
 * Search intent signals by company, category, score, or surge status.
 */
export async function searchIntentSignals(
  params: IntentSearchParams
): Promise<PharosIQResult<IntentSignal[]>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: [],
      error:
        "pharosIQ API not configured. Upload intent CSV manually.",
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (params.company) queryParams.set("company", params.company);
    if (params.domain) queryParams.set("domain", params.domain);
    if (params.category) queryParams.set("category", params.category);
    if (params.minScore != null)
      queryParams.set("min_score", String(params.minScore));
    if (params.surgeOnly) queryParams.set("surge_only", "true");
    if (params.since) queryParams.set("since", params.since);
    queryParams.set("limit", String(params.limit ?? 50));
    if (params.offset) queryParams.set("offset", String(params.offset));

    const result = await pharosiqFetch<{
      signals: Array<{
        signal_id: string;
        company: string;
        company_domain: string | null;
        intent_category: string;
        intent_score: number;
        surge_score: number | null;
        first_seen: string;
        last_seen: string;
        signal_sources: string[];
      }>;
      total: number;
    }>(config, `/intent/signals?${queryParams}`);

    const signals: IntentSignal[] = result.signals.map((s) => ({
      signalId: s.signal_id,
      company: s.company,
      companyDomain: s.company_domain,
      intentCategory: s.intent_category,
      intentScore: s.intent_score,
      surgeScore: s.surge_score,
      firstSeen: s.first_seen,
      lastSeen: s.last_seen,
      signalSources: s.signal_sources,
    }));

    return { source: "pharosiq", data: signals };
  } catch (error) {
    logDegraded("search-intent-signals", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch intent signals from pharosIQ.",
    };
  }
}

/**
 * Get intent signals for a specific company (by name or domain).
 * Useful for deal enrichment — "what topics is this prospect researching?"
 */
export async function getCompanyIntentSignals(
  companyIdentifier: { name?: string; domain?: string },
  options: { minScore?: number; limit?: number } = {}
): Promise<PharosIQResult<IntentSignal[]>> {
  return searchIntentSignals({
    company: companyIdentifier.name,
    domain: companyIdentifier.domain,
    minScore: options.minScore ?? 30,
    limit: options.limit ?? 20,
  });
}

/**
 * Get surge signals — companies showing sudden spikes in intent activity.
 * Primary input for Prospect Scout's weekly research sweeps.
 */
export async function getSurgeSignals(
  options: {
    category?: string;
    minScore?: number;
    since?: string;
    limit?: number;
  } = {}
): Promise<PharosIQResult<IntentSignal[]>> {
  return searchIntentSignals({
    category: options.category,
    minScore: options.minScore ?? 50,
    surgeOnly: true,
    since: options.since,
    limit: options.limit ?? 50,
  });
}

// ── Intent Categories ─────────────────────────────────────────────────

/**
 * List available intent categories.
 */
export async function getIntentCategories(
  options: { parentCategory?: string } = {}
): Promise<PharosIQResult<IntentCategory[]>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: [],
      error: "pharosIQ API not configured.",
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (options.parentCategory) {
      queryParams.set("parent", options.parentCategory);
    }

    const result = await pharosiqFetch<{
      categories: Array<{
        category_id: string;
        name: string;
        description: string | null;
        parent_category: string | null;
      }>;
    }>(config, `/intent/categories?${queryParams}`);

    const categories: IntentCategory[] = result.categories.map((c) => ({
      categoryId: c.category_id,
      name: c.name,
      description: c.description,
      parentCategory: c.parent_category,
    }));

    return { source: "pharosiq", data: categories };
  } catch (error) {
    logDegraded("get-categories", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch intent categories.",
    };
  }
}

// ── Contact Counts (for prospect sizing) ──────────────────────────────

/**
 * Get contact count for a company — used by Prospect Scout to estimate
 * how many decision-makers are in the database for a target account.
 */
export async function getContactCount(
  company: string
): Promise<PharosIQResult<number>> {
  const config = getPharosIQConfig();
  if (!config) {
    return {
      source: "manual",
      data: 0,
      error: "pharosIQ API not configured.",
    };
  }

  try {
    const result = await pharosiqFetch<{ count: number }>(
      config,
      `/contacts/count?company=${encodeURIComponent(company)}`
    );
    return { source: "pharosiq", data: result.count };
  } catch (error) {
    logDegraded("contact-count", error);
    return {
      source: "manual",
      data: 0,
      error: "Failed to get contact count from pharosIQ.",
    };
  }
}

// ── Utility ───────────────────────────────────────────────────────────

/** Log integration degradation without throwing. */
function logDegraded(operation: string, error: unknown): void {
  console.error(
    `[pharosiq-data] ${operation} degraded:`,
    error instanceof Error ? error.message : error
  );
}
