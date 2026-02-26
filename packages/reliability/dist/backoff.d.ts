export type BackoffJitterStrategy = 'none' | 'full' | 'equal';
export interface ExponentialBackoffOptions {
    attempt: number;
    baseDelayMs: number;
    maxDelayMs?: number;
    jitter?: BackoffJitterStrategy;
}
export declare const DEFAULT_MAX_BACKOFF_DELAY_MS = 30000;
export declare function calculateExponentialBackoff(options: ExponentialBackoffOptions): number;
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=backoff.d.ts.map