export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerPolicy {
  failureRateThreshold: number;
  minimumRequestThreshold: number;
  rollingWindowMs: number;
  numberOfBuckets: number;
  openStateDelayMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitSnapshot {
  state: CircuitBreakerState;
  totalRequests: number;
  totalFailures: number;
  failureRate: number;
  openedAt: number | null;
  halfOpenInFlight: number;
}

type Bucket = {
  startTime: number;
  total: number;
  failures: number;
};

const DEFAULT_POLICY: CircuitBreakerPolicy = {
  failureRateThreshold: 0.5,
  minimumRequestThreshold: 20,
  rollingWindowMs: 30_000,
  numberOfBuckets: 10,
  openStateDelayMs: 15_000,
  halfOpenMaxCalls: 3,
};

export class CircuitOpenError extends Error {
  public readonly statusCode = 503;
  public readonly code = 'CIRCUIT_OPEN';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RollingWindowCircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private openedAt: number | null = null;
  private halfOpenInFlight = 0;
  private halfOpenSuccessCount = 0;
  private readonly policy: CircuitBreakerPolicy;
  private readonly buckets: Bucket[];

  constructor(policy: Partial<CircuitBreakerPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.buckets = Array.from({ length: this.policy.numberOfBuckets }, () => ({
      startTime: 0,
      total: 0,
      failures: 0,
    }));
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getSnapshot(now: number = Date.now()): CircuitSnapshot {
    const { totalRequests, totalFailures } = this.getWindowStats(now);
    const failureRate = totalRequests === 0 ? 0 : totalFailures / totalRequests;

    return {
      state: this.state,
      totalRequests,
      totalFailures,
      failureRate,
      openedAt: this.openedAt,
      halfOpenInFlight: this.halfOpenInFlight,
    };
  }

  assertRequestAllowed(now: number = Date.now()): void {
    if (this.state === 'CLOSED') {
      return;
    }

    if (this.state === 'OPEN') {
      const canProbe = this.openedAt !== null && now - this.openedAt >= this.policy.openStateDelayMs;
      if (!canProbe) {
        throw new CircuitOpenError('Circuit is open');
      }

      this.state = 'HALF_OPEN';
      this.halfOpenInFlight = 0;
      this.halfOpenSuccessCount = 0;
    }

    if (this.halfOpenInFlight >= this.policy.halfOpenMaxCalls) {
      throw new CircuitOpenError('Circuit is half-open and probe capacity is exhausted');
    }

    this.halfOpenInFlight += 1;
  }

  onSuccess(now: number = Date.now()): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      this.halfOpenSuccessCount += 1;

      if (this.halfOpenSuccessCount >= this.policy.halfOpenMaxCalls) {
        this.close();
      }
      return;
    }

    this.record(now, false);
  }

  onFailure(now: number = Date.now()): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      this.open(now);
      return;
    }

    this.record(now, true);

    const { totalRequests, totalFailures } = this.getWindowStats(now);
    if (totalRequests < this.policy.minimumRequestThreshold) {
      return;
    }

    const failureRate = totalFailures / totalRequests;
    if (failureRate >= this.policy.failureRateThreshold) {
      this.open(now);
    }
  }

  onBypassHalfOpen(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
    }
  }

  private open(now: number): void {
    this.state = 'OPEN';
    this.openedAt = now;
    this.halfOpenInFlight = 0;
    this.halfOpenSuccessCount = 0;
  }

  private close(): void {
    this.state = 'CLOSED';
    this.openedAt = null;
    this.halfOpenInFlight = 0;
    this.halfOpenSuccessCount = 0;
    for (const bucket of this.buckets) {
      bucket.startTime = 0;
      bucket.total = 0;
      bucket.failures = 0;
    }
  }

  private record(now: number, failed: boolean): void {
    const bucket = this.getBucket(now);
    bucket.total += 1;
    if (failed) {
      bucket.failures += 1;
    }
  }

  private getWindowStats(now: number): { totalRequests: number; totalFailures: number } {
    const cutoff = now - this.policy.rollingWindowMs;
    let totalRequests = 0;
    let totalFailures = 0;

    for (const bucket of this.buckets) {
      if (bucket.startTime < cutoff) {
        continue;
      }

      totalRequests += bucket.total;
      totalFailures += bucket.failures;
    }

    return { totalRequests, totalFailures };
  }

  private getBucket(now: number): Bucket {
    const bucketDuration = Math.max(1, Math.floor(this.policy.rollingWindowMs / this.policy.numberOfBuckets));
    const bucketStartTime = now - (now % bucketDuration);
    const index = Math.floor(bucketStartTime / bucketDuration) % this.policy.numberOfBuckets;
    const bucket = this.buckets[index];

    if (bucket.startTime !== bucketStartTime) {
      bucket.startTime = bucketStartTime;
      bucket.total = 0;
      bucket.failures = 0;
    }

    return bucket;
  }
}