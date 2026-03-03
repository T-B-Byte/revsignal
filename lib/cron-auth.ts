import { timingSafeEqual } from "crypto";

/**
 * Verify a cron secret from the Authorization header using timing-safe comparison.
 * Returns true if the header matches `Bearer <CRON_SECRET>`.
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;

  const expected = `Bearer ${cronSecret}`;

  // Timing-safe comparison requires equal-length buffers
  if (authHeader.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
