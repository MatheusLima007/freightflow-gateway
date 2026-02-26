"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSandboxEngine = void 0;
const observability_1 = require("@freightflow/observability");
const reliability_1 = require("@freightflow/reliability");
const seeded_rng_1 = require("./seeded-rng");
const rate_limit_1 = require("./rate-limit");
const faults_1 = require("./faults");
const state_1 = require("./state");
class ProviderSandboxEngine {
    providerId;
    rng;
    constructor(providerId, seedOffset = 0) {
        this.providerId = providerId;
        const settings = (0, state_1.getSandboxSettings)();
        this.rng = new seeded_rng_1.SeededRng(settings.seed + seedOffset);
    }
    computeLatency(baseMs, jitterMs) {
        if (jitterMs <= 0) {
            return Math.max(0, baseMs);
        }
        const jitter = this.rng.nextInt(0, jitterMs);
        return Math.max(0, baseMs + jitter);
    }
    async run(operation, action, options) {
        const settings = (0, state_1.getSandboxSettings)();
        const profile = (0, state_1.getProviderSandboxProfile)(this.providerId);
        const latency = this.computeLatency(profile.latencyMs.baseMs, profile.latencyMs.jitterMs);
        if (latency > 0) {
            await (0, reliability_1.sleep)(latency);
        }
        if (settings.rateLimitEnabled) {
            const rateLimit = (0, rate_limit_1.consumeRateLimitToken)(`${this.providerId}:${operation}`, profile.rateLimit, Date.now());
            if (!rateLimit.allowed) {
                (0, state_1.incrementSandboxCounter)(this.providerId, operation, 'rate_limited');
                observability_1.logger.warn({ providerId: this.providerId, operation, profile: profile.name, outcome: 'rate_limited' }, 'Sandbox rate limit applied');
                throw (0, faults_1.makeFaultError)(operation, this.providerId, 'http429', rateLimit.retryAfterSeconds);
            }
        }
        if (settings.chaosEnabled) {
            const rates = (0, faults_1.mergeErrorRates)(profile.errorRatesByOperation[operation]);
            const fault = (0, faults_1.pickFaultKind)(this.rng.next(), rates);
            if (fault !== 'none' && fault !== 'payloadDivergence') {
                (0, state_1.incrementSandboxCounter)(this.providerId, operation, `fault_${fault}`);
                observability_1.logger.warn({ providerId: this.providerId, operation, profile: profile.name, outcome: `fault_${fault}` }, 'Sandbox injected failure');
                throw (0, faults_1.makeFaultError)(operation, this.providerId, fault);
            }
        }
        const baseResult = await action();
        let result = baseResult;
        if (operation === 'tracking' && result && typeof result === 'object' && profile.consistencyLagMs > 0) {
            const trackingResult = { ...result };
            if (Array.isArray(trackingResult.events) && trackingResult.events.length > 1 && this.should(0.45)) {
                trackingResult.events = trackingResult.events.slice(0, Math.max(1, trackingResult.events.length - 1));
                if (trackingResult.status === 'DELIVERED') {
                    trackingResult.status = 'IN_TRANSIT';
                }
                if (trackingResult.lastPolledAt instanceof Date) {
                    trackingResult.lastPolledAt = new Date(trackingResult.lastPolledAt.getTime() - profile.consistencyLagMs);
                }
                (0, state_1.incrementSandboxCounter)(this.providerId, operation, 'consistency_lag');
            }
            result = trackingResult;
        }
        if (settings.chaosEnabled && options?.mutatePayload) {
            const rates = (0, faults_1.mergeErrorRates)(profile.errorRatesByOperation[operation]);
            const shouldMutate = this.rng.chance(rates.payloadDivergence);
            if (shouldMutate) {
                (0, state_1.incrementSandboxCounter)(this.providerId, operation, 'payload_divergence');
                const mutated = options.mutatePayload(result);
                observability_1.logger.warn({ providerId: this.providerId, operation, profile: profile.name }, 'Sandbox mutated payload for divergence scenario');
                return mutated;
            }
        }
        (0, state_1.incrementSandboxCounter)(this.providerId, operation, 'success');
        observability_1.logger.info({ providerId: this.providerId, operation, profile: profile.name, outcome: 'success' }, 'Sandbox operation completed');
        return result;
    }
    maybe(probability, values) {
        if (!this.rng.chance(probability) || values.length < 2) {
            return values;
        }
        const shuffled = [...values];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = this.rng.nextInt(0, index);
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }
    should(probability) {
        return this.rng.chance(probability);
    }
}
exports.ProviderSandboxEngine = ProviderSandboxEngine;
//# sourceMappingURL=engine.js.map