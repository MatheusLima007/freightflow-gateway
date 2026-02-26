"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryProviderDecorator = void 0;
const observability_1 = require("@freightflow/observability");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class RetryProviderDecorator {
    provider;
    maxRetries;
    baseDelayMs;
    constructor(provider, maxRetries = 3, baseDelayMs = 500) {
        this.provider = provider;
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
    }
    get id() {
        return this.provider.id;
    }
    isRetryable(error) {
        if (!error || typeof error !== 'object')
            return true;
        const maybeStatusCode = error.statusCode;
        if (typeof maybeStatusCode !== 'number')
            return true;
        if (maybeStatusCode >= 500 || maybeStatusCode === 429) {
            return true;
        }
        return false;
    }
    getJitterDelay(attempt) {
        const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
        const jitterFactor = 0.5 + Math.random();
        return Math.round(exponentialDelay * jitterFactor);
    }
    async withRetry(operationName, operation) {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                const retryable = this.isRetryable(error);
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
                    const waitTime = this.getJitterDelay(attempt);
                    await delay(waitTime);
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