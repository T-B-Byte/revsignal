const MAX_CACHE_SIZE = 10_000;

const tokenCache = new Map<
  string,
  { count: number; lastReset: number }
>();

/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This implementation uses an in-memory Map, which does NOT persist
 * across serverless invocations on Vercel. For production, replace with
 * a distributed store (Upstash Redis, Vercel KV, etc.).
 */
export function rateLimit(options: { interval: number }) {
  const { interval } = options;

  return {
    check(limit: number, token: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const entry = tokenCache.get(token);

      // Evict expired entries if cache is getting large
      if (tokenCache.size > MAX_CACHE_SIZE) {
        for (const [key, val] of tokenCache) {
          if (now - val.lastReset > interval) {
            tokenCache.delete(key);
          }
        }
      }

      if (!entry || now - entry.lastReset > interval) {
        tokenCache.set(token, { count: 1, lastReset: now });
        return { success: true, remaining: limit - 1 };
      }

      if (entry.count >= limit) {
        return { success: false, remaining: 0 };
      }

      entry.count++;
      return { success: true, remaining: limit - entry.count };
    },
  };
}
