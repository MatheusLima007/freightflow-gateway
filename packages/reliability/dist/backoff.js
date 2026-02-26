"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_BACKOFF_DELAY_MS = void 0;
exports.calculateExponentialBackoff = calculateExponentialBackoff;
exports.sleep = sleep;
exports.DEFAULT_MAX_BACKOFF_DELAY_MS = 30_000;
function calculateExponentialBackoff(options) {
    const safeAttempt = Math.max(1, options.attempt);
    const maxDelayMs = options.maxDelayMs ?? exports.DEFAULT_MAX_BACKOFF_DELAY_MS;
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=backoff.js.map