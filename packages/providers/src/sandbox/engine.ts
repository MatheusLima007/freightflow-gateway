import { logger } from '@freightflow/observability';
import { sleep } from '@freightflow/reliability';
import { SeededRng } from './seeded-rng';
import { consumeRateLimitToken } from './rate-limit';
import { makeFaultError, mergeErrorRates, pickFaultKind } from './faults';
import { getProviderSandboxProfile, getSandboxSettings, incrementSandboxCounter } from './state';
import { SandboxOperation } from './types';

export class ProviderSandboxEngine {
  private readonly rng: SeededRng;

  constructor(private readonly providerId: string, seedOffset = 0) {
    const settings = getSandboxSettings();
    this.rng = new SeededRng(settings.seed + seedOffset);
  }

  private computeLatency(baseMs: number, jitterMs: number): number {
    if (jitterMs <= 0) {
      return Math.max(0, baseMs);
    }

    const jitter = this.rng.nextInt(0, jitterMs);
    return Math.max(0, baseMs + jitter);
  }

  async run<T>(operation: SandboxOperation, action: () => Promise<T>, options?: { mutatePayload?: (value: T) => T }): Promise<T> {
    const settings = getSandboxSettings();
    const profile = getProviderSandboxProfile(this.providerId);

    const latency = this.computeLatency(profile.latencyMs.baseMs, profile.latencyMs.jitterMs);
    if (latency > 0) {
      await sleep(latency);
    }

    if (settings.rateLimitEnabled) {
      const rateLimit = consumeRateLimitToken(`${this.providerId}:${operation}`, profile.rateLimit, Date.now());
      if (!rateLimit.allowed) {
        incrementSandboxCounter(this.providerId, operation, 'rate_limited');
        logger.warn({ providerId: this.providerId, operation, profile: profile.name, outcome: 'rate_limited' }, 'Sandbox rate limit applied');
        throw makeFaultError(operation, this.providerId, 'http429', rateLimit.retryAfterSeconds);
      }
    }

    if (settings.chaosEnabled) {
      const rates = mergeErrorRates(profile.errorRatesByOperation[operation]);
      const fault = pickFaultKind(this.rng.next(), rates);

      if (fault !== 'none' && fault !== 'payloadDivergence') {
        incrementSandboxCounter(this.providerId, operation, `fault_${fault}`);
        logger.warn({ providerId: this.providerId, operation, profile: profile.name, outcome: `fault_${fault}` }, 'Sandbox injected failure');
        throw makeFaultError(operation, this.providerId, fault);
      }
    }

    const baseResult = await action();
    let result: T = baseResult;

    if (operation === 'tracking' && result && typeof result === 'object' && profile.consistencyLagMs > 0) {
      const trackingResult = { ...(result as Record<string, unknown>) } as {
        status?: unknown;
        lastPolledAt?: unknown;
        events?: Array<{ date?: Date; description?: string; location?: string }>;
      };

      if (Array.isArray(trackingResult.events) && trackingResult.events.length > 1 && this.should(0.45)) {
        trackingResult.events = trackingResult.events.slice(0, Math.max(1, trackingResult.events.length - 1));
        if (trackingResult.status === 'DELIVERED') {
          trackingResult.status = 'IN_TRANSIT';
        }

        if (trackingResult.lastPolledAt instanceof Date) {
          trackingResult.lastPolledAt = new Date(trackingResult.lastPolledAt.getTime() - profile.consistencyLagMs);
        }

        incrementSandboxCounter(this.providerId, operation, 'consistency_lag');
      }

      result = trackingResult as T;
    }

    if (settings.chaosEnabled && options?.mutatePayload) {
      const rates = mergeErrorRates(profile.errorRatesByOperation[operation]);
      const shouldMutate = this.rng.chance(rates.payloadDivergence);
      if (shouldMutate) {
        incrementSandboxCounter(this.providerId, operation, 'payload_divergence');
        const mutated = options.mutatePayload(result);
        logger.warn({ providerId: this.providerId, operation, profile: profile.name }, 'Sandbox mutated payload for divergence scenario');
        return mutated;
      }
    }

    incrementSandboxCounter(this.providerId, operation, 'success');
    logger.info({ providerId: this.providerId, operation, profile: profile.name, outcome: 'success' }, 'Sandbox operation completed');
    return result;
  }

  maybe<T>(probability: number, values: T[]): T[] {
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

  should(probability: number): boolean {
    return this.rng.chance(probability);
  }
}
