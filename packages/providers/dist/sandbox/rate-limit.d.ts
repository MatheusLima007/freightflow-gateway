import { RateLimitConfig } from './types';
export declare function consumeRateLimitToken(key: string, config: RateLimitConfig, now: number): {
    allowed: boolean;
    retryAfterSeconds: number;
};
export declare function resetRateLimitBuckets(): void;
//# sourceMappingURL=rate-limit.d.ts.map