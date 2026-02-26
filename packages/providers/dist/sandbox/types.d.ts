export type SandboxOperation = 'quote' | 'shipment' | 'label' | 'tracking' | 'webhook';
export interface ErrorRates {
    timeout: number;
    http5xx: number;
    http429: number;
    http4xx: number;
    connReset: number;
    payloadDivergence: number;
}
export interface RateLimitConfig {
    requestsPerMinute: number;
    burst: number;
}
export interface WebhookChaosConfig {
    duplicateRate: number;
    reorderRate: number;
    dropRate: number;
}
export interface LatencyConfig {
    baseMs: number;
    jitterMs: number;
}
export interface SandboxProfile {
    name: string;
    latencyMs: LatencyConfig;
    errorRatesByOperation: Partial<Record<SandboxOperation, Partial<ErrorRates>>>;
    rateLimit: RateLimitConfig;
    consistencyLagMs: number;
    webhookChaos: WebhookChaosConfig;
}
export type FaultKind = 'none' | 'timeout' | 'http500' | 'http502' | 'http503' | 'http429' | 'http400' | 'connReset' | 'payloadDivergence';
export interface SandboxRuntimeSettings {
    seed: number;
    chaosEnabled: boolean;
    rateLimitEnabled: boolean;
    configPath?: string;
}
//# sourceMappingURL=types.d.ts.map