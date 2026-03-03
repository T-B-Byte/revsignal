/**
 * Salesforce REST API Integration — Accounts, Contacts, Opportunities, Activities
 *
 * Provides authenticated access to Salesforce CRM data via REST API.
 * Used by: SFDC Sync Agent, Strategist
 *
 * Auth flow:
 *  - OAuth2 Web Server flow (authorization code) for per-user delegated access
 *  - Tokens stored in `integration_tokens` table
 *  - Automatic token refresh when access token expires
 *
 * Graceful degradation:
 *  - Every function returns a discriminated union: { source: "sfdc", data } | { source: "manual", data }
 *  - Callers always get a valid shape — never an exception for API downtime
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ── Configuration ─────────────────────────────────────────────────────

interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  loginUrl: string;
}

function getSalesforceConfig(): SalesforceConfig | null {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/auth/callback/salesforce`,
    loginUrl: process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com",
  };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface SalesforceTokens {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface SfdcAccount {
  Id: string;
  Name: string;
  Website: string | null;
  Industry: string | null;
  BillingCity: string | null;
  BillingState: string | null;
  Phone: string | null;
  OwnerId: string | null;
  LastModifiedDate: string;
}

export interface SfdcContact {
  Id: string;
  AccountId: string | null;
  FirstName: string | null;
  LastName: string;
  Name: string;
  Title: string | null;
  Email: string | null;
  Phone: string | null;
  LastModifiedDate: string;
}

export interface SfdcOpportunity {
  Id: string;
  AccountId: string | null;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
  Description: string | null;
  OwnerId: string | null;
  LastModifiedDate: string;
}

export interface SfdcTask {
  Id: string;
  WhoId: string | null; // Contact/Lead ID
  WhatId: string | null; // Account/Opportunity ID
  Subject: string;
  Description: string | null;
  Status: string;
  Priority: string;
  ActivityDate: string | null;
  LastModifiedDate: string;
}

export interface SfdcEvent {
  Id: string;
  WhoId: string | null;
  WhatId: string | null;
  Subject: string;
  Description: string | null;
  StartDateTime: string;
  EndDateTime: string;
  Location: string | null;
  LastModifiedDate: string;
}

/** SOQL query result envelope */
export interface SoqlResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/** Discriminated union for graceful degradation */
export type SfdcResult<T> =
  | { source: "sfdc"; data: T; error?: undefined }
  | { source: "manual"; data: T; error: string };

/** Integration health status */
export type IntegrationHealth = "active" | "degraded" | "disconnected";

// ── Token Management ──────────────────────────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<SalesforceTokens | null> {
  const config = getSalesforceConfig();
  if (!config) return null;

  try {
    const response = await fetch(
      `${config.loginUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          code,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "[salesforce] Token exchange failed:",
        response.status,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      // Salesforce tokens last ~2 hours; assume 1.5h for safety
      expiresAt: Date.now() + 90 * 60 * 1000,
    };
  } catch (error) {
    console.error(
      "[salesforce] Token exchange error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<SalesforceTokens | null> {
  const config = getSalesforceConfig();
  if (!config) return null;

  try {
    const response = await fetch(
      `${config.loginUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      console.error("[salesforce] Token refresh failed:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // SFDC doesn't rotate refresh tokens
      instanceUrl: data.instance_url,
      expiresAt: Date.now() + 90 * 60 * 1000,
    };
  } catch (error) {
    console.error(
      "[salesforce] Token refresh error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Get a valid access token + instance URL for a user, refreshing if expired.
 */
async function getValidConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accessToken: string; instanceUrl: string } | null> {
  const { data: tokenRow } = await supabase
    .from("integration_tokens")
    .select("access_token, refresh_token, instance_url, expires_at")
    .eq("user_id", userId)
    .eq("provider", "salesforce")
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();

  // Still valid (with 5-min buffer)
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return {
      accessToken: tokenRow.access_token,
      instanceUrl: tokenRow.instance_url,
    };
  }

  // Needs refresh
  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  if (!refreshed) return null;

  await supabase
    .from("integration_tokens")
    .update({
      access_token: refreshed.accessToken,
      instance_url: refreshed.instanceUrl,
      expires_at: new Date(refreshed.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "salesforce");

  return {
    accessToken: refreshed.accessToken,
    instanceUrl: refreshed.instanceUrl,
  };
}

/**
 * Store tokens after initial OAuth exchange.
 */
export async function storeTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: SalesforceTokens
): Promise<void> {
  await supabase.from("integration_tokens").upsert(
    {
      user_id: userId,
      provider: "salesforce",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      instance_url: tokens.instanceUrl,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );
}

// ── Core SFDC API Caller ──────────────────────────────────────────────

/**
 * Make an authenticated Salesforce REST API request.
 */
async function sfdcFetch<T>(
  conn: { accessToken: string; instanceUrl: string },
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${conn.instanceUrl}/services/data/v62.0${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Salesforce API ${response.status}: ${response.statusText} — ${errorBody}`
    );
  }

  // 204 No Content (e.g., successful PATCH/DELETE)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ── Integration Health ────────────────────────────────────────────────

/**
 * Check Salesforce integration health for a user.
 */
export async function checkHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<IntegrationHealth> {
  const config = getSalesforceConfig();
  if (!config) return "disconnected";

  const conn = await getValidConnection(supabase, userId);
  if (!conn) return "disconnected";

  try {
    await sfdcFetch(conn, "/limits");
    return "active";
  } catch {
    return "degraded";
  }
}

// ── SOQL Queries ──────────────────────────────────────────────────────

/**
 * Execute a SOQL query. Use parameterized values to avoid injection.
 */
export async function query<T>(
  supabase: SupabaseClient,
  userId: string,
  soql: string
): Promise<SfdcResult<T[]>> {
  const conn = await getValidConnection(supabase, userId);
  if (!conn) {
    return {
      source: "manual",
      data: [],
      error: "Salesforce not connected.",
    };
  }

  try {
    const result = await sfdcFetch<SoqlResult<T>>(
      conn,
      `/query?q=${encodeURIComponent(soql)}`
    );
    return { source: "sfdc", data: result.records };
  } catch (error) {
    logDegraded("soql-query", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to execute Salesforce query.",
    };
  }
}

// ── Accounts ──────────────────────────────────────────────────────────

/**
 * Fetch accounts, optionally filtered by name or modified date.
 */
export async function getAccounts(
  supabase: SupabaseClient,
  userId: string,
  options: { modifiedSince?: string; nameContains?: string; limit?: number } = {}
): Promise<SfdcResult<SfdcAccount[]>> {
  const conditions: string[] = [];
  if (options.modifiedSince) {
    conditions.push(`LastModifiedDate > ${options.modifiedSince}`);
  }
  if (options.nameContains) {
    // Escape single quotes in SOQL
    const escaped = options.nameContains.replace(/'/g, "\\'");
    conditions.push(`Name LIKE '%${escaped}%'`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;

  const soql = `SELECT Id, Name, Website, Industry, BillingCity, BillingState, Phone, OwnerId, LastModifiedDate FROM Account${where} ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

  return query<SfdcAccount>(supabase, userId, soql);
}

/**
 * Get a single account by ID.
 */
export async function getAccountById(
  supabase: SupabaseClient,
  userId: string,
  accountId: string
): Promise<SfdcResult<SfdcAccount | null>> {
  const conn = await getValidConnection(supabase, userId);
  if (!conn) {
    return {
      source: "manual",
      data: null,
      error: "Salesforce not connected.",
    };
  }

  try {
    const account = await sfdcFetch<SfdcAccount>(
      conn,
      `/sobjects/Account/${accountId}`
    );
    return { source: "sfdc", data: account };
  } catch (error) {
    logDegraded("get-account", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch account from Salesforce.",
    };
  }
}

// ── Contacts ──────────────────────────────────────────────────────────

/**
 * Fetch contacts, optionally filtered by account or modified date.
 */
export async function getContacts(
  supabase: SupabaseClient,
  userId: string,
  options: { accountId?: string; modifiedSince?: string; limit?: number } = {}
): Promise<SfdcResult<SfdcContact[]>> {
  const conditions: string[] = [];
  if (options.accountId) {
    conditions.push(`AccountId = '${options.accountId}'`);
  }
  if (options.modifiedSince) {
    conditions.push(`LastModifiedDate > ${options.modifiedSince}`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;

  const soql = `SELECT Id, AccountId, FirstName, LastName, Name, Title, Email, Phone, LastModifiedDate FROM Contact${where} ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

  return query<SfdcContact>(supabase, userId, soql);
}

// ── Opportunities ─────────────────────────────────────────────────────

/**
 * Fetch opportunities, optionally filtered by account, stage, or modified date.
 */
export async function getOpportunities(
  supabase: SupabaseClient,
  userId: string,
  options: {
    accountId?: string;
    stageName?: string;
    modifiedSince?: string;
    limit?: number;
  } = {}
): Promise<SfdcResult<SfdcOpportunity[]>> {
  const conditions: string[] = [];
  if (options.accountId) {
    conditions.push(`AccountId = '${options.accountId}'`);
  }
  if (options.stageName) {
    const escaped = options.stageName.replace(/'/g, "\\'");
    conditions.push(`StageName = '${escaped}'`);
  }
  if (options.modifiedSince) {
    conditions.push(`LastModifiedDate > ${options.modifiedSince}`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;

  const soql = `SELECT Id, AccountId, Name, StageName, Amount, CloseDate, Probability, Description, OwnerId, LastModifiedDate FROM Opportunity${where} ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

  return query<SfdcOpportunity>(supabase, userId, soql);
}

/**
 * Get a single opportunity by ID.
 */
export async function getOpportunityById(
  supabase: SupabaseClient,
  userId: string,
  opportunityId: string
): Promise<SfdcResult<SfdcOpportunity | null>> {
  const conn = await getValidConnection(supabase, userId);
  if (!conn) {
    return {
      source: "manual",
      data: null,
      error: "Salesforce not connected.",
    };
  }

  try {
    const opp = await sfdcFetch<SfdcOpportunity>(
      conn,
      `/sobjects/Opportunity/${opportunityId}`
    );
    return { source: "sfdc", data: opp };
  } catch (error) {
    logDegraded("get-opportunity", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch opportunity from Salesforce.",
    };
  }
}

// ── Write Operations ──────────────────────────────────────────────────

/**
 * Create a new record in Salesforce.
 */
export async function createRecord(
  supabase: SupabaseClient,
  userId: string,
  sobjectType: string,
  fields: Record<string, string | number | boolean | null>
): Promise<SfdcResult<{ id: string } | null>> {
  const conn = await getValidConnection(supabase, userId);
  if (!conn) {
    return {
      source: "manual",
      data: null,
      error: "Salesforce not connected. Create record manually.",
    };
  }

  try {
    const result = await sfdcFetch<{ id: string; success: boolean }>(
      conn,
      `/sobjects/${sobjectType}`,
      {
        method: "POST",
        body: JSON.stringify(fields),
      }
    );
    return { source: "sfdc", data: { id: result.id } };
  } catch (error) {
    logDegraded("create-record", error);
    return {
      source: "manual",
      data: null,
      error: `Failed to create ${sobjectType} in Salesforce.`,
    };
  }
}

/**
 * Update an existing record in Salesforce.
 */
export async function updateRecord(
  supabase: SupabaseClient,
  userId: string,
  sobjectType: string,
  recordId: string,
  fields: Record<string, string | number | boolean | null>
): Promise<SfdcResult<{ updated: boolean }>> {
  const conn = await getValidConnection(supabase, userId);
  if (!conn) {
    return {
      source: "manual",
      data: { updated: false },
      error: "Salesforce not connected. Update record manually.",
    };
  }

  try {
    await sfdcFetch(conn, `/sobjects/${sobjectType}/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return { source: "sfdc", data: { updated: true } };
  } catch (error) {
    logDegraded("update-record", error);
    return {
      source: "manual",
      data: { updated: false },
      error: `Failed to update ${sobjectType} in Salesforce.`,
    };
  }
}

// ── Activities (Tasks & Events) ───────────────────────────────────────

/**
 * Log an activity (Task) in Salesforce — e.g., logging a call or email.
 */
export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  activity: {
    subject: string;
    description?: string;
    whoId?: string; // Contact/Lead
    whatId?: string; // Account/Opportunity
    status?: string;
    priority?: string;
    activityDate?: string;
  }
): Promise<SfdcResult<{ id: string } | null>> {
  return createRecord(supabase, userId, "Task", {
    Subject: activity.subject,
    Description: activity.description ?? null,
    WhoId: activity.whoId ?? null,
    WhatId: activity.whatId ?? null,
    Status: activity.status ?? "Completed",
    Priority: activity.priority ?? "Normal",
    ActivityDate: activity.activityDate ?? new Date().toISOString().split("T")[0],
  });
}

/**
 * Fetch recent tasks for an opportunity.
 */
export async function getTasksForOpportunity(
  supabase: SupabaseClient,
  userId: string,
  opportunityId: string,
  options: { limit?: number } = {}
): Promise<SfdcResult<SfdcTask[]>> {
  const limit = options.limit ?? 25;
  const soql = `SELECT Id, WhoId, WhatId, Subject, Description, Status, Priority, ActivityDate, LastModifiedDate FROM Task WHERE WhatId = '${opportunityId}' ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

  return query<SfdcTask>(supabase, userId, soql);
}

/**
 * Fetch recent events for an opportunity.
 */
export async function getEventsForOpportunity(
  supabase: SupabaseClient,
  userId: string,
  opportunityId: string,
  options: { limit?: number } = {}
): Promise<SfdcResult<SfdcEvent[]>> {
  const limit = options.limit ?? 25;
  const soql = `SELECT Id, WhoId, WhatId, Subject, Description, StartDateTime, EndDateTime, Location, LastModifiedDate FROM Event WHERE WhatId = '${opportunityId}' ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

  return query<SfdcEvent>(supabase, userId, soql);
}

// ── OAuth URL Builder ─────────────────────────────────────────────────

/**
 * Build the Salesforce OAuth2 authorization URL.
 */
export function buildAuthUrl(state: string): string | null {
  const config = getSalesforceConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: "api refresh_token",
  });

  return `${config.loginUrl}/services/oauth2/authorize?${params}`;
}

// ── Utility ───────────────────────────────────────────────────────────

/** Log integration degradation without throwing. */
function logDegraded(operation: string, error: unknown): void {
  console.error(
    `[salesforce] ${operation} degraded:`,
    error instanceof Error ? error.message : error
  );
}
