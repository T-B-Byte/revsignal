/**
 * Shared Supabase admin client for seed scripts.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * using manual file parsing (no external deps required).
 *
 * Usage:
 *   import { getAdminClient, getUserId } from './lib/supabase';
 *   const supabase = getAdminClient();
 *   const userId = getUserId();
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// .env.local loader
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn(`[seed] .env.local not found at ${envPath} — relying on existing env vars`);
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Only set if not already defined (real env takes precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Load env vars immediately on import
loadEnvLocal();

// ---------------------------------------------------------------------------
// Supabase admin client (bypasses RLS via service role key)
// ---------------------------------------------------------------------------

let _client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '[seed] Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL). ' +
        'Set it in .env.local or as an environment variable.'
    );
  }
  if (!key) {
    throw new Error(
      '[seed] Missing SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set it in .env.local or as an environment variable.'
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// User ID resolution
// ---------------------------------------------------------------------------

const DEFAULT_PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Resolves the user_id to use for seed data.
 *
 * Priority:
 *   1. --user-id CLI argument
 *   2. USER_ID environment variable
 *   3. Placeholder UUID (00000000-0000-0000-0000-000000000000)
 */
export function getUserId(): string {
  // Check CLI args: --user-id <uuid>
  const args = process.argv;
  const flagIndex = args.indexOf('--user-id');
  if (flagIndex !== -1 && args[flagIndex + 1]) {
    const id = args[flagIndex + 1];
    console.log(`[seed] Using user_id from --user-id flag: ${id}`);
    return id;
  }

  // Check env var
  if (process.env.USER_ID) {
    console.log(`[seed] Using user_id from USER_ID env var: ${process.env.USER_ID}`);
    return process.env.USER_ID;
  }

  // Default placeholder
  console.log(
    `[seed] No user_id provided — using placeholder: ${DEFAULT_PLACEHOLDER_USER_ID}\n` +
      `       (Records will be reassigned on first login)`
  );
  return DEFAULT_PLACEHOLDER_USER_ID;
}
