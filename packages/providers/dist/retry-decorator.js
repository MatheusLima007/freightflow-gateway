"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryProviderDecorator = void 0;
const observability_1 = require("@freightflow/observability");
const reliability_1 = require("@freightflow/reliability");
class RetryProviderDecorator {
    provider;
    maxRetries;
    baseDelayMs;
    maxDelayMs;
    maxRetryTimeMs;
    constructor(provider, maxRetries = 3, baseDelayMs = 500, maxDelayMs = 30_000, maxRetryTimeMs = 5_000) {
        this.provider = provider;
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
        this.maxDelayMs = maxDelayMs;
        this.maxRetryTimeMs = maxRetryTimeMs;
    }
    get id() {
        return this.provider.id;
    }
    isRetryable(error) {
        if (!error || typeof error !== 'object')
            return false;
        const maybeCode = error.code;
        if (maybeCode === 'CIRCUIT_OPEN') {
            return false;
        }
        if (typeof maybeCode === 'string') {
            const transientErrorCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNABORTED']);
            if (transientErrorCodes.has(maybeCode)) {
                return true;
            }
        }
        const maybeStatusCode = error.statusCode;
        if (typeof maybeStatusCode !== 'number')
            return false;
        if (maybeStatusCode >= 500 || maybeStatusCode === 429) {
            return true;
        }
        return false;
    }
    async withRetry(operationName, operation) {
        let lastError;
        const startedAt = Date.now();
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const attemptStartedAt = Date.now();
            try {
                const result = await operation();
                (0, observability_1.observeHistogram)('request_latency_ms', Date.now() - attemptStartedAt, {
                    providerId: this.id,
                    operation: operationName,
                    outcome: 'success',
                });
                return result;
            }
            catch (error) {
                lastError = error;
                const retryable = this.isRetryable(error);
                (0, observability_1.incrementCounter)('retry_attempts_total', {
                    providerId: this.id,
                    operation: operationName,
                    retryable,
                });
                (0, observability_1.observeHistogram)('request_latency_ms', Date.now() - attemptStartedAt, {
                    providerId: this.id,
                    operation: operationName,
                    outcome: 'error',
                });
                observability_1.logger.warn({
                    providerId: this.id,
                    operation: operationName,
                    attempt,
                    maxRetries: this.maxRetries,
                    retryable,
                    error: error instanceof Error ? error.message : String(error)
                }, 'Provider operation failed, retrying...');
                if (!retryable) {
                    break;
                }
                if (attempt < this.maxRetries) {
                    const elapsedMs = Date.now() - startedAt;
                    if (elapsedMs >= this.maxRetryTimeMs) {
                        observability_1.logger.warn({
                            providerId: this.id,
                            operation: operationName,
                            elapsedMs,
                            maxRetryTimeMs: this.maxRetryTimeMs,
                        }, 'Retry budget exhausted before next attempt');
                        break;
                    }
                    const waitTime = (0, reliability_1.calculateExponentialBackoff)({
                        attempt,
                        baseDelayMs: this.baseDelayMs,
                        maxDelayMs: this.maxDelayMs,
                        jitter: 'equal',
                    });
                    observability_1.logger.info({ providerId: this.id, operation: operationName, attempt, delayMs: waitTime }, 'Waiting before retry attempt');
                    if (elapsedMs + waitTime > this.maxRetryTimeMs) {
                        observability_1.logger.warn({
                            providerId: this.id,
                            operation: operationName,
                            elapsedMs,
                            waitTime,
                            maxRetryTimeMs: this.maxRetryTimeMs,
                        }, 'Skipping retry because it exceeds retry budget');
                        break;
                    }
                    await (0, reliability_1.sleep)(waitTime);
                }
            }
        }
        observability_1.logger.error({ providerId: this.id, operation: operationName }, 'Provider operation failed after all retries');
        throw lastError;
    }
    async quote(input) {
        return this.withRetry('quote', () => this.provider.quote(input));
    }
    async createShipment(input) {
        return this.withRetry('createShipment', () => this.provider.createShipment(input));
    }
    async createLabel(shipmentId) {
        return this.withRetry('createLabel', () => this.provider.createLabel(shipmentId));
    }
    async track(trackingCode) {
        return this.withRetry('track', () => this.provider.track(trackingCode));
    }
}
exports.RetryProviderDecorator = RetryProviderDecorator;
//# sourceMappingURL=retry-decorator.js.map