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
export declare class CircuitOpenError extends Error {
    readonly statusCode = 503;
    readonly code = "CIRCUIT_OPEN";
    constructor(message: string);
}
export declare class RollingWindowCircuitBreaker {
    private state;
    private openedAt;
    private halfOpenInFlight;
    private halfOpenSuccessCount;
    private readonly policy;
    private readonly buckets;
    constructor(policy?: Partial<CircuitBreakerPolicy>);
    getState(): CircuitBreakerState;
    getSnapshot(now?: number): CircuitSnapshot;
    assertRequestAllowed(now?: number): void;
    onSuccess(now?: number): void;
    onFailure(now?: number): void;
    onBypassHalfOpen(): void;
    private open;
    private close;
    private record;
    private getWindowStats;
    private getBucket;
}
//# sourceMappingURL=circuit-breaker.d.ts.map