"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANDBOX_PROFILES = void 0;
const defaultErrorRates = {
    timeout: 0.01,
    http5xx: 0.01,
    http429: 0.01,
    http4xx: 0.01,
    connReset: 0.01,
    payloadDivergence: 0.02,
};
exports.SANDBOX_PROFILES = {
    default: {
        name: 'default',
        latencyMs: { baseMs: 120, jitterMs: 80 },
        errorRatesByOperation: {
            quote: { ...defaultErrorRates, timeout: 0 },
            shipment: { ...defaultErrorRates },
            label: { ...defaultErrorRates },
            tracking: { ...defaultErrorRates, payloadDivergence: 0.04 },
            webhook: { ...defaultErrorRates },
        },
        rateLimit: {
            requestsPerMinute: 180,
            burst: 30,
        },
        consistencyLagMs: 1_000,
        webhookChaos: {
            duplicateRate: 0.03,
            reorderRate: 0.02,
            dropRate: 0.01,
        },
    },
    flaky: {
        name: 'flaky',
        latencyMs: { baseMs: 250, jitterMs: 300 },
        errorRatesByOperation: {
            quote: { ...defaultErrorRates, timeout: 0.06, connReset: 0.05, http5xx: 0.07 },
            shipment: { ...defaultErrorRates, timeout: 0.08, connReset: 0.06, http5xx: 0.08 },
            label: { ...defaultErrorRates, timeout: 0.06, http5xx: 0.08 },
            tracking: { ...defaultErrorRates, timeout: 0.03, payloadDivergence: 0.15, http5xx: 0.05 },
            webhook: { ...defaultErrorRates, timeout: 0.05, http5xx: 0.09 },
        },
        rateLimit: {
            requestsPerMinute: 90,
            burst: 10,
        },
        consistencyLagMs: 9_000,
        webhookChaos: {
            duplicateRate: 0.18,
            reorderRate: 0.24,
            dropRate: 0.09,
        },
    },
    degraded: {
        name: 'degraded',
        latencyMs: { baseMs: 500, jitterMs: 500 },
        errorRatesByOperation: {
            quote: { ...defaultErrorRates, timeout: 0.08, http5xx: 0.06, http429: 0.05 },
            shipment: { ...defaultErrorRates, timeout: 0.1, http5xx: 0.12, http429: 0.08 },
            label: { ...defaultErrorRates, timeout: 0.08, http5xx: 0.1 },
            tracking: { ...defaultErrorRates, timeout: 0.06, http5xx: 0.08, payloadDivergence: 0.2 },
            webhook: { ...defaultErrorRates, timeout: 0.07, http5xx: 0.12 },
        },
        rateLimit: {
            requestsPerMinute: 60,
            burst: 8,
        },
        consistencyLagMs: 20_000,
        webhookChaos: {
            duplicateRate: 0.22,
            reorderRate: 0.3,
            dropRate: 0.14,
        },
    },
    rateLimited: {
        name: 'rateLimited',
        latencyMs: { baseMs: 180, jitterMs: 150 },
        errorRatesByOperation: {
            quote: { ...defaultErrorRates, http429: 0.3, timeout: 0.02 },
            shipment: { ...defaultErrorRates, http429: 0.38, timeout: 0.03 },
            label: { ...defaultErrorRates, http429: 0.35 },
            tracking: { ...defaultErrorRates, http429: 0.28, payloadDivergence: 0.08 },
            webhook: { ...defaultErrorRates, http429: 0.25 },
        },
        rateLimit: {
            requestsPerMinute: 24,
            burst: 4,
        },
        consistencyLagMs: 5_000,
        webhookChaos: {
            duplicateRate: 0.08,
            reorderRate: 0.08,
            dropRate: 0.02,
        },
    },
    peakHours: {
        name: 'peakHours',
        latencyMs: { baseMs: 350, jitterMs: 250 },
        errorRatesByOperation: {
            quote: { ...defaultErrorRates, http429: 0.12, timeout: 0.04 },
            shipment: { ...defaultErrorRates, http429: 0.14, http5xx: 0.05, timeout: 0.05 },
            label: { ...defaultErrorRates, http429: 0.12, timeout: 0.04 },
            tracking: { ...defaultErrorRates, http429: 0.12, payloadDivergence: 0.1 },
            webhook: { ...defaultErrorRates, http429: 0.1, timeout: 0.03 },
        },
        rateLimit: {
            requestsPerMinute: 72,
            burst: 9,
        },
        consistencyLagMs: 7_500,
        webhookChaos: {
            duplicateRate: 0.11,
            reorderRate: 0.12,
            dropRate: 0.04,
        },
    },
};
//# sourceMappingURL=profiles.js.map