import { beforeEach, describe, expect, it } from 'vitest';
import { consumeRateLimitToken, resetRateLimitBuckets } from './rate-limit';

describe('sandbox rate limit', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('respeita burst inicial e passa a limitar com retry-after', () => {
    const config = { requestsPerMinute: 60, burst: 2 };
    const now = Date.now();

    expect(consumeRateLimitToken('ACME:quote', config, now).allowed).toBe(true);
    expect(consumeRateLimitToken('ACME:quote', config, now).allowed).toBe(true);

    const blocked = consumeRateLimitToken('ACME:quote', config, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('refaz refill após passagem de tempo', () => {
    const config = { requestsPerMinute: 60, burst: 1 };
    const now = Date.now();

    expect(consumeRateLimitToken('ROCKET:shipment', config, now).allowed).toBe(true);
    expect(consumeRateLimitToken('ROCKET:shipment', config, now).allowed).toBe(false);
    expect(consumeRateLimitToken('ROCKET:shipment', config, now + 1_100).allowed).toBe(true);
  });
});
