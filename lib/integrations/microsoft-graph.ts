/**
 * Microsoft Graph Integration — Teams, Outlook, Calendar, OneDrive
 *
 * Provides authenticated access to Microsoft 365 services via Graph API.
 * Used by: Follow-Up Enforcer, Call Analyst, Strategist
 *
 * Auth flow:
 *  - Per-user delegated access via OAuth2 authorization code flow
 *  - Tokens stored in `integration_tokens` table (encrypted at rest by Supabase)
 *  - Automatic token refresh when access token expires
 *
 * Graceful degradation:
 *  - Every function returns a discriminated union: { source: "graph", data } | { source: "manual", data: [] }
 *  - Callers always get a valid shape — never an exception for API downtime
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ── Configuration ─────────────────────────────────────────────────────

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const TOKEN_URL_TEMPLATE =
  "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token";

interface GraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

function getGraphConfig(): GraphConfig | null {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret || !tenantId) return null;

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri: `${appUrl}/auth/callback/microsoft`,
  };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface GraphTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface TeamsMessage {
  id: string;
  chatId: string;
  from: string;
  body: string;
  sentAt: string;
  importance: string;
}

export interface TeamsChat {
  id: string;
  topic: string | null;
  chatType: "oneOnOne" | "group" | "meeting";
  lastUpdated: string;
  members: string[];
}

export interface CallTranscript {
  callId: string;
  organizer: string;
  startTime: string;
  endTime: string;
  transcriptContent: string;
  participants: string[];
}

export interface OutlookEmail {
  id: string;
  subject: string;
  from: string;
  toRecipients: string[];
  body: string;
  receivedAt: string;
  conversationId: string;
  hasAttachments: boolean;
  importance: string;
  isRead: boolean;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  organizer: string;
  attendees: string[];
  location: string | null;
  body: string | null;
  isOnlineMeeting: boolean;
  onlineMeetingUrl: string | null;
}

/** Discriminated union for graceful degradation */
export type GraphResult<T> =
  | { source: "graph"; data: T; error?: undefined }
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
): Promise<GraphTokens | null> {
  const config = getGraphConfig();
  if (!config) return null;

  const tokenUrl = TOKEN_URL_TEMPLATE.replace("{tenant}", config.tenantId);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        scope:
          "offline_access Mail.Read Mail.Send Calendars.Read Chat.Read OnlineMeetings.Read User.Read",
      }),
    });

    if (!response.ok) {
      console.error(
        "[microsoft-graph] Token exchange failed:",
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
      "[microsoft-graph] Token exchange error:",
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
): Promise<GraphTokens | null> {
  const config = getGraphConfig();
  if (!config) return null;

  const tokenUrl = TOKEN_URL_TEMPLATE.replace("{tenant}", config.tenantId);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "offline_access Mail.Read Mail.Send Calendars.Read Chat.Read OnlineMeetings.Read User.Read",
      }),
    });

    if (!response.ok) {
      console.error(
        "[microsoft-graph] Token refresh failed:",
        response.status
      );
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
      "[microsoft-graph] Token refresh error:",
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
    .eq("provider", "microsoft")
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
    .eq("provider", "microsoft");

  return refreshed.accessToken;
}

/**
 * Store tokens after initial OAuth exchange.
 */
export async function storeTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: GraphTokens
): Promise<void> {
  await supabase.from("integration_tokens").upsert(
    {
      user_id: userId,
      provider: "microsoft",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );
}

// ── Core Graph API Caller ─────────────────────────────────────────────

/**
 * Make an authenticated Graph API request with automatic error handling.
 */
async function graphFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GRAPH_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Graph API ${response.status}: ${response.statusText} — ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Integration Health ────────────────────────────────────────────────

/**
 * Check Microsoft Graph integration health for a user.
 */
export async function checkHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<IntegrationHealth> {
  const config = getGraphConfig();
  if (!config) return "disconnected";

  const token = await getValidToken(supabase, userId);
  if (!token) return "disconnected";

  try {
    await graphFetch(token, "/me");
    return "active";
  } catch {
    return "degraded";
  }
}

// ── Teams: Chats ──────────────────────────────────────────────────────

/**
 * Fetch recent Teams chats for the authenticated user.
 */
export async function getTeamsChats(
  supabase: SupabaseClient,
  userId: string,
  options: { top?: number } = {}
): Promise<GraphResult<TeamsChat[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Microsoft Graph not connected. Paste Teams messages manually.",
    };
  }

  try {
    const top = options.top ?? 25;
    const result = await graphFetch<{
      value: Array<{
        id: string;
        topic: string | null;
        chatType: string;
        lastUpdatedDateTime: string;
        members?: Array<{ displayName: string }>;
      }>;
    }>(token, `/me/chats?$top=${top}&$orderby=lastUpdatedDateTime desc`);

    const chats: TeamsChat[] = result.value.map((c) => ({
      id: c.id,
      topic: c.topic,
      chatType: c.chatType as TeamsChat["chatType"],
      lastUpdated: c.lastUpdatedDateTime,
      members: c.members?.map((m) => m.displayName) ?? [],
    }));

    return { source: "graph", data: chats };
  } catch (error) {
    logDegraded("teams-chats", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch Teams chats. Paste messages manually.",
    };
  }
}

/**
 * Fetch messages from a specific Teams chat.
 */
export async function getTeamsChatMessages(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  options: { top?: number; since?: string } = {}
): Promise<GraphResult<TeamsMessage[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Microsoft Graph not connected.",
    };
  }

  try {
    const top = options.top ?? 50;
    let endpoint = `/me/chats/${chatId}/messages?$top=${top}&$orderby=createdDateTime desc`;
    if (options.since) {
      endpoint += `&$filter=createdDateTime gt ${options.since}`;
    }

    const result = await graphFetch<{
      value: Array<{
        id: string;
        chatId: string;
        from?: { user?: { displayName: string } };
        body: { content: string; contentType: string };
        createdDateTime: string;
        importance: string;
      }>;
    }>(token, endpoint);

    const messages: TeamsMessage[] = result.value
      .filter((m) => m.body?.content) // Skip system messages
      .map((m) => ({
        id: m.id,
        chatId: m.chatId ?? chatId,
        from: m.from?.user?.displayName ?? "Unknown",
        body: stripHtmlTags(m.body.content),
        sentAt: m.createdDateTime,
        importance: m.importance ?? "normal",
      }));

    return { source: "graph", data: messages };
  } catch (error) {
    logDegraded("teams-messages", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch chat messages.",
    };
  }
}

// ── Teams: Call Transcripts ───────────────────────────────────────────

/**
 * Fetch recent call recordings/transcripts from Teams.
 * Requires OnlineMeetings.Read permission.
 */
export async function getCallTranscripts(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string; top?: number } = {}
): Promise<GraphResult<CallTranscript[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Microsoft Graph not connected. Upload transcripts manually.",
    };
  }

  try {
    const top = options.top ?? 10;

    // Get recent online meetings
    let meetingsEndpoint = `/me/onlineMeetings?$top=${top}&$orderby=startDateTime desc`;
    if (options.since) {
      meetingsEndpoint += `&$filter=startDateTime gt ${options.since}`;
    }

    const meetings = await graphFetch<{
      value: Array<{
        id: string;
        subject: string;
        startDateTime: string;
        endDateTime: string;
        participants?: {
          organizer?: { upn: string };
          attendees?: Array<{ upn: string }>;
        };
      }>;
    }>(token, meetingsEndpoint);

    // Fetch transcripts for each meeting (parallel with limit)
    const transcripts: CallTranscript[] = [];

    for (const meeting of meetings.value) {
      try {
        const transcriptList = await graphFetch<{
          value: Array<{ id: string }>;
        }>(token, `/me/onlineMeetings/${meeting.id}/transcripts`);

        if (transcriptList.value.length > 0) {
          const transcriptId = transcriptList.value[0].id;
          const content = await graphFetch<{ content: string }>(
            token,
            `/me/onlineMeetings/${meeting.id}/transcripts/${transcriptId}/content`
          );

          transcripts.push({
            callId: meeting.id,
            organizer: meeting.participants?.organizer?.upn ?? "Unknown",
            startTime: meeting.startDateTime,
            endTime: meeting.endDateTime,
            transcriptContent: content.content,
            participants:
              meeting.participants?.attendees?.map((a) => a.upn) ?? [],
          });
        }
      } catch {
        // Individual transcript fetch failure is OK — skip and continue
        continue;
      }
    }

    return { source: "graph", data: transcripts };
  } catch (error) {
    logDegraded("call-transcripts", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch call transcripts. Upload manually.",
    };
  }
}

// ── Outlook: Email ────────────────────────────────────────────────────

/**
 * Fetch recent emails from Outlook inbox.
 */
export async function getOutlookEmails(
  supabase: SupabaseClient,
  userId: string,
  options: { top?: number; since?: string; folder?: string } = {}
): Promise<GraphResult<OutlookEmail[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Microsoft Graph not connected. Paste emails manually.",
    };
  }

  try {
    const top = options.top ?? 50;
    const folder = options.folder ?? "inbox";
    let endpoint = `/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,body,receivedDateTime,conversationId,hasAttachments,importance,isRead`;

    if (options.since) {
      endpoint += `&$filter=receivedDateTime gt ${options.since}`;
    }

    const result = await graphFetch<{
      value: Array<{
        id: string;
        subject: string;
        from: { emailAddress: { name: string; address: string } };
        toRecipients: Array<{
          emailAddress: { name: string; address: string };
        }>;
        body: { content: string; contentType: string };
        receivedDateTime: string;
        conversationId: string;
        hasAttachments: boolean;
        importance: string;
        isRead: boolean;
      }>;
    }>(token, endpoint);

    const emails: OutlookEmail[] = result.value.map((e) => ({
      id: e.id,
      subject: e.subject ?? "(no subject)",
      from: e.from?.emailAddress
        ? `${e.from.emailAddress.name} <${e.from.emailAddress.address}>`
        : "Unknown",
      toRecipients: e.toRecipients?.map(
        (r) => `${r.emailAddress.name} <${r.emailAddress.address}>`
      ) ?? [],
      body: stripHtmlTags(e.body?.content ?? ""),
      receivedAt: e.receivedDateTime,
      conversationId: e.conversationId,
      hasAttachments: e.hasAttachments ?? false,
      importance: e.importance ?? "normal",
      isRead: e.isRead ?? false,
    }));

    return { source: "graph", data: emails };
  } catch (error) {
    logDegraded("outlook-emails", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch Outlook emails. Paste emails manually.",
    };
  }
}

/**
 * Send an email via Outlook.
 */
export async function sendOutlookEmail(
  supabase: SupabaseClient,
  userId: string,
  email: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }
): Promise<GraphResult<{ sent: boolean }>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: { sent: false },
      error: "Microsoft Graph not connected. Send email manually.",
    };
  }

  try {
    const message = {
      subject: email.subject,
      body: {
        contentType: email.isHtml ? "HTML" : "Text",
        content: email.body,
      },
      toRecipients: email.to.map((addr) => ({
        emailAddress: { address: addr },
      })),
      ccRecipients:
        email.cc?.map((addr) => ({
          emailAddress: { address: addr },
        })) ?? [],
    };

    await graphFetch(token, "/me/sendMail", {
      method: "POST",
      body: JSON.stringify({ message, saveToSentItems: true }),
    });

    return { source: "graph", data: { sent: true } };
  } catch (error) {
    logDegraded("outlook-send", error);
    return {
      source: "manual",
      data: { sent: false },
      error: "Failed to send email via Outlook. Send manually.",
    };
  }
}

// ── Outlook: Calendar ─────────────────────────────────────────────────

/**
 * Fetch upcoming calendar events.
 */
export async function getCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  options: { startDate?: string; endDate?: string; top?: number } = {}
): Promise<GraphResult<CalendarEvent[]>> {
  const token = await getValidToken(supabase, userId);
  if (!token) {
    return {
      source: "manual",
      data: [],
      error: "Microsoft Graph not connected.",
    };
  }

  try {
    const now = new Date();
    const startDate =
      options.startDate ?? now.toISOString();
    const endDate =
      options.endDate ??
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const top = options.top ?? 25;

    const endpoint = `/me/calendarview?startDateTime=${startDate}&endDateTime=${endDate}&$top=${top}&$orderby=start/dateTime&$select=id,subject,start,end,organizer,attendees,location,body,isOnlineMeeting,onlineMeeting`;

    const result = await graphFetch<{
      value: Array<{
        id: string;
        subject: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        organizer: { emailAddress: { name: string; address: string } };
        attendees: Array<{
          emailAddress: { name: string; address: string };
        }>;
        location?: { displayName: string };
        body?: { content: string };
        isOnlineMeeting: boolean;
        onlineMeeting?: { joinUrl: string };
      }>;
    }>(token, endpoint);

    const events: CalendarEvent[] = result.value.map((e) => ({
      id: e.id,
      subject: e.subject ?? "(no subject)",
      start: e.start.dateTime,
      end: e.end.dateTime,
      organizer: e.organizer?.emailAddress?.name ?? "Unknown",
      attendees:
        e.attendees?.map((a) => a.emailAddress?.name ?? a.emailAddress?.address) ?? [],
      location: e.location?.displayName ?? null,
      body: e.body ? stripHtmlTags(e.body.content) : null,
      isOnlineMeeting: e.isOnlineMeeting ?? false,
      onlineMeetingUrl: e.onlineMeeting?.joinUrl ?? null,
    }));

    return { source: "graph", data: events };
  } catch (error) {
    logDegraded("calendar-events", error);
    return {
      source: "manual",
      data: [],
      error: "Failed to fetch calendar events.",
    };
  }
}

// ── OAuth URL Builder ─────────────────────────────────────────────────

/**
 * Build the Microsoft OAuth2 authorization URL for the consent flow.
 */
export function buildAuthUrl(state: string): string | null {
  const config = getGraphConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope:
      "offline_access Mail.Read Mail.Send Calendars.Read Chat.Read OnlineMeetings.Read User.Read",
    state,
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params}`;
}

// ── Utility ───────────────────────────────────────────────────────────

/** Strip HTML tags from Graph API content, preserving text. */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Log integration degradation without throwing. */
function logDegraded(operation: string, error: unknown): void {
  console.error(
    `[microsoft-graph] ${operation} degraded:`,
    error instanceof Error ? error.message : error
  );
}
