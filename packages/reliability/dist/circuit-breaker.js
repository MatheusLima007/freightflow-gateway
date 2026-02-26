"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingWindowCircuitBreaker = exports.CircuitOpenError = void 0;
const DEFAULT_POLICY = {
    failureRateThreshold: 0.5,
    minimumRequestThreshold: 20,
    rollingWindowMs: 30_000,
    numberOfBuckets: 10,
    openStateDelayMs: 15_000,
    halfOpenMaxCalls: 3,
};
class CircuitOpenError extends Error {
    statusCode = 503;
    code = 'CIRCUIT_OPEN';
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CircuitOpenError = CircuitOpenError;
class RollingWindowCircuitBreaker {
    state = 'CLOSED';
    openedAt = null;
    halfOpenInFlight = 0;
    halfOpenSuccessCount = 0;
    policy;
    buckets;
    constructor(policy = {}) {
        this.policy = { ...DEFAULT_POLICY, ...policy };
        this.buckets = Array.from({ length: this.policy.numberOfBuckets }, () => ({
            startTime: 0,
            total: 0,
            failures: 0,
        }));
    }
    getState() {
        return this.state;
    }
    getSnapshot(now = Date.now()) {
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
    assertRequestAllowed(now = Date.now()) {
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
    onSuccess(now = Date.now()) {
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
    onFailure(now = Date.now()) {
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
    onBypassHalfOpen() {
        if (this.state === 'HALF_OPEN') {
            this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
        }
    }
    open(now) {
        this.state = 'OPEN';
        this.openedAt = now;
        this.halfOpenInFlight = 0;
        this.halfOpenSuccessCount = 0;
    }
    close() {
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
    record(now, failed) {
        const bucket = this.getBucket(now);
        bucket.total += 1;
        if (failed) {
            bucket.failures += 1;
        }
    }
    getWindowStats(now) {
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
    getBucket(now) {
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
exports.RollingWindowCircuitBreaker = RollingWindowCircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map