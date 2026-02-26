import { RateLimitConfig } from './types';

interface BucketState {
  tokens: number;
  lastRefillAt: number;
}

const buckets = new Map<string, BucketState>();

export function consumeRateLimitToken(key: string, config: RateLimitConfig, now: number): { allowed: boolean; retryAfterSeconds: number } {
  const refillPerSecond = config.requestsPerMinute / 60;
  const existing = buckets.get(key) ?? { tokens: config.burst, lastRefillAt: now };

  const elapsedSeconds = Math.max(0, (now - existing.lastRefillAt) / 1000);
  const refilledTokens = elapsedSeconds * refillPerSecond;
  const available = Math.min(config.burst, existing.tokens + refilledTokens);

  if (available < 1) {
    const missing = 1 - available;
    const retryAfterSeconds = Math.max(1, Math.ceil(missing / refillPerSecond));
    buckets.set(key, { tokens: available, lastRefillAt: now });
    return { allowed: false, retryAfterSeconds };
  }

  buckets.set(key, { tokens: available - 1, lastRefillAt: now });
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}
