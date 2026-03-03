/**
 * Plaud Integration — AI Voice Recorder Transcripts & Summaries
 *
 * Provides authenticated access to Plaud's Developer Platform for
 * retrieving transcripts, summaries, and metadata from recorded
 * in-person conversations and phone calls.
 * Used by: Call Analyst, Follow-Up Enforcer, Strategist
 *
 * Auth flow:
 *  - OAuth2 authorization code flow for per-user delegated access
 *  - Tokens stored in `integration_tokens` table (encrypted at rest by Supabase)
 *  - Automatic token refresh when access token expires
 *
 * Webhook:
 *  - Plaud fires `audio_transcribe.completed` when a recording is processed
 *  - Webhook receiver at `app/api/webhooks/plaud/route.ts` validates signature
 *    and triggers the transcript processing pipeline
 *
 * Graceful degradation:
 *  - Every function returns a discriminated union: { source: "plaud", data } | { source: "manual", data }
 *  - Callers always get a valid shape — never an exception for API downtime
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ── Configuration ─────────────────────────────────────────────────────

const PLAUD_API_BASE = "https://api.plaud.ai/v1";
const PLAUD_AUTH_BASE = "https://auth.plaud.ai";

interface PlaudConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string | null;
}

function getPlaudConfig(): PlaudConfig | null {
  const clientId = process.env.PLAUD_CLIENT_ID;
  const clientSecret = process.env.PLAUD_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/auth/callback/plaud`,
    webhookSecret: process.env.PLAUD_WEBHOOK_SECRET ?? null,
  };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface PlaudTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface PlaudTranscript {
  fileId: string;
  title: string | null;
  duration: number; // seconds
  language: string;
  createdAt: string;
  transcript: TranscriptSegment[];
  rawText: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface PlaudSummary {
  fileId: string;
  summary: string;
  actionItems: string[];
  keyTopics: string[];
  templateType: string | null;
}

export interface PlaudFile {
  fileId: string;
  title: string | null;
  duration: number; // seconds
  language: string;
  status: "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  hasTranscript: boolean;
  hasSummary: boolean;
}

/** Webhook event payload from Plaud */
export interface PlaudWebhookEvent {
  eventType: string;
  data: {
    fileId: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

/** Discriminated union for graceful degradation */
export type PlaudResult<T> =
  | { source: "plaud"; data: T; error?: undefined }
  | { source: "manual"; data: T; error: string };

/** Integration health status */
export type IntegrationHealth = "active" | "degraded" | "disconnected";

// ── Token Management ──────────────────────────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called once during the OAuth callback flow.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<PlaudTokens | null> {
  const config = getPlaudConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${PLAUD_AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      console.error(
        "[plaud] Token exchange failed:",
        response.status,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    console.error(
      "[plaud] Token exchange error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<PlaudTokens | null> {
  const config = getPlaudConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${PLAUD_AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("[plaud] Token refresh failed:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    console.error(
      "[plaud] Token refresh error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Get a valid access token for a user, refreshing if expired.
 * Reads/writes tokens from the integration_tokens table.
 */
export async function getValidToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "plaud")
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();

  // Still valid (with 5-min buffer)
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return tokenRow.access_token;
  }

  // Needs refresh
  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  if (!refreshed) return null;

  // Store updated tokens
  await supabase
    .from("integration_tokens")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      expires_at: new Date(refreshed.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "plaud");

  return refreshed.accessToken;
}

/**
 * Store tokens after initial OAuth exchange.
 */
export async function storeTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: PlaudTokens
): Promise<void> {
  await supabase.from("integration_tokens").upsert(
    {
      user_id: userId,
      provider: "plaud",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );
}

// ── Core API Caller ───────────────────────────────────────────────────

/**
 * Make an authenticated Plaud API request with automatic error handling.
 */
async function plaudFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${PLAUD_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Plaud API ${response.status}: ${response.statusText} — ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Integration Health ────────────────────────────────────────────────

/**
 * Check Plaud integration health for a user.
 */
export async function checkHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<IntegrationHealth> {
  const config = getPlaudConfig();
  if (!config) return "disconnected";

  const token = await getValidToken(supabase, userId);
  if (!token) return "disconnected";

  try {
    await plaudFetch(token, "/me");
    return "active";
  } catch {
    return "degraded";
  }
}

// ── Files ──────────────────────────────────────────────────────────────

/**
 * List recent audio files for the authenticated user.
 */
export async function listFiles(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; since?: string } = {}
): Promise<PlaudResult<PlaudFile[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Plaud not connected. Upload transcripts manually.",
    };
  }

  try {
    const params = new URLSearchParams();
    params.set("limit", String(options.limit ?? 25));
    if (options.since) params.set("since", options.since);

    const result = await plaudFetch<{
      files: Array<{
        file_id: string;
        title: string | null;
        duration: number;
        language: string;
        status: string;
        created_at: string;
        updated_at: string;
        has_transcript: boolean;
        has_summary: boolean;
      }>;
    }>(token, `/files?${params}`);

    const files: PlaudFile[] = result.files.map((f) => ({
      fileId: f.file_id,
      title: f.title,
      duration: f.duration,
      language: f.language,
      status: f.status as PlaudFile["status"],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      hasTranscript: f.has_transcript,
      hasSummary: f.has_summary,
    }));

    return { source: "plaud", data: files };
  } catch (error) {
    logDegraded("list-files", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to list Plaud recordings. Upload transcripts manually.",
    };
  }
}

/**
 * Get a single file by ID.
 */
export async function getFile(
  supabase: SupabaseClient,
  userId: string,
  fileId: string
): Promise<PlaudResult<PlaudFile | null>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: null,
      error: "Plaud not connected.",
    };
  }

  try {
    const f = await plaudFetch<{
      file_id: string;
      title: string | null;
      duration: number;
      language: string;
      status: string;
      created_at: string;
      updated_at: string;
      has_transcript: boolean;
      has_summary: boolean;
    }>(token, `/files/${encodeURIComponent(fileId)}`);

    return {
      source: "plaud",
      data: {
        fileId: f.file_id,
        title: f.title,
        duration: f.duration,
        language: f.language,
        status: f.status as PlaudFile["status"],
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        hasTranscript: f.has_transcript,
        hasSummary: f.has_summary,
      },
    };
  } catch (error) {
    logDegraded("get-file", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch file from Plaud.",
    };
  }
}

// ── Transcripts ───────────────────────────────────────────────────────

/**
 * Get the full transcript for a recording.
 * This is the primary data that feeds into Call Analyst processing.
 */
export async function getTranscript(
  supabase: SupabaseClient,
  userId: string,
  fileId: string
): Promise<PlaudResult<PlaudTranscript | null>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: null,
      error: "Plaud not connected. Paste transcript manually.",
    };
  }

  try {
    const result = await plaudFetch<{
      file_id: string;
      title: string | null;
      duration: number;
      language: string;
      created_at: string;
      segments: Array<{
        speaker: string;
        text: string;
        start_time: number;
        end_time: number;
      }>;
      raw_text: string;
    }>(token, `/files/${encodeURIComponent(fileId)}/transcript`);

    return {
      source: "plaud",
      data: {
        fileId: result.file_id,
        title: result.title,
        duration: result.duration,
        language: result.language,
        createdAt: result.created_at,
        transcript: result.segments.map((s) => ({
          speaker: s.speaker,
          text: s.text,
          startTime: s.start_time,
          endTime: s.end_time,
        })),
        rawText: result.raw_text,
      },
    };
  } catch (error) {
    logDegraded("get-transcript", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch transcript from Plaud. Paste transcript manually.",
    };
  }
}

// ── Summaries ─────────────────────────────────────────────────────────

/**
 * Get the AI-generated summary for a recording.
 * Includes action items and key topics extracted by Plaud's models.
 */
export async function getSummary(
  supabase: SupabaseClient,
  userId: string,
  fileId: string
): Promise<PlaudResult<PlaudSummary | null>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: null,
      error: "Plaud not connected.",
    };
  }

  try {
    const result = await plaudFetch<{
      file_id: string;
      summary: string;
      action_items: string[];
      key_topics: string[];
      template_type: string | null;
    }>(token, `/files/${encodeURIComponent(fileId)}/summary`);

    return {
      source: "plaud",
      data: {
        fileId: result.file_id,
        summary: result.summary,
        actionItems: result.action_items,
        keyTopics: result.key_topics,
        templateType: result.template_type,
      },
    };
  } catch (error) {
    logDegraded("get-summary", error);
    return {
      source: "manual",
      data: null,
      error: "Failed to fetch summary from Plaud.",
    };
  }
}

// ── Webhook Signature Verification ────────────────────────────────────

/**
 * Verify a Plaud webhook signature.
 * Returns the parsed event if valid, null if verification fails.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<PlaudWebhookEvent | null> {
  const config = getPlaudConfig();
  if (!config?.webhookSecret) {
    console.error("[plaud] Webhook secret not configured");
    return null;
  }

  try {
    // HMAC-SHA256 signature verification
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(config.webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison to prevent timing attacks
    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(signature, expectedSignature)
    ) {
      console.error("[plaud] Webhook signature mismatch");
      return null;
    }

    const event = JSON.parse(payload);
    return {
      eventType: event.event_type,
      data: {
        fileId: event.data?.file_id,
        ...event.data,
      },
      timestamp: event.timestamp,
    };
  } catch (error) {
    console.error(
      "[plaud] Webhook verification error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ── OAuth URL Builder ─────────────────────────────────────────────────

/**
 * Build the Plaud OAuth2 authorization URL for the consent flow.
 */
export function buildAuthUrl(state: string): string | null {
  const config = getPlaudConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
    scope: "files:read transcripts:read summaries:read",
  });

  return `${PLAUD_AUTH_BASE}/oauth/authorize?${params}`;
}

// ── Utility ───────────────────────────────────────────────────────────

/** Log integration degradation without throwing. */
function logDegraded(operation: string, error: unknown): void {
  console.error(
    `[plaud] ${operation} degraded:`,
    error instanceof Error ? error.message : error
  );
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
