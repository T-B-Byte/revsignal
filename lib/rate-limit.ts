const tokenCache = new Map<
  string,
  { count: number; lastReset: number }
>();

export function rateLimit(options: {
  interval: number;
  uniqueTokenPerInterval?: number;
}) {
  const { interval } = options;

  return {
    check(limit: number, token: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const entry = tokenCache.get(token);

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
