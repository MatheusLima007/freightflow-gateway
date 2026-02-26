export type BackoffJitterStrategy = 'none' | 'full' | 'equal';

export interface ExponentialBackoffOptions {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  jitter?: BackoffJitterStrategy;
}

export const DEFAULT_MAX_BACKOFF_DELAY_MS = 30_000;

export function calculateExponentialBackoff(options: ExponentialBackoffOptions): number {
  const safeAttempt = Math.max(1, options.attempt);
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_BACKOFF_DELAY_MS;
  const exponentialDelay = options.baseDelayMs * Math.pow(2, safeAttempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  const jitter = options.jitter ?? 'full';
  if (jitter === 'none') {
    return Math.round(cappedDelay);
  }

  if (jitter === 'equal') {
    const halfDelay = cappedDelay / 2;
    return Math.round(halfDelay + Math.random() * halfDelay);
  }

  return Math.round(Math.random() * cappedDelay);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}