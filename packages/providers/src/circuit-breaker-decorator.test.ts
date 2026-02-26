import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, ProviderError, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { describe, expect, it } from 'vitest';
import { CircuitBreakerProviderDecorator, CircuitOpenError } from './circuit-breaker-decorator';

class TestProvider implements ICarrierProvider {
  id = 'TEST';
  fail = true;

  async quote(_input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    if (this.fail) {
      throw new ProviderError('Provider unavailable');
    }

    return [{
      providerId: this.id,
      serviceName: 'Test',
      price: 1,
      currency: 'USD',
      estimatedDays: 1,
    }];
  }

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    throw new Error('not used');
  }

  async createLabel(_shipmentId: string): Promise<LabelNormalized> {
    throw new Error('not used');
  }

  async track(_trackingCode: string): Promise<TrackingNormalized> {
    throw new Error('not used');
  }
}

const input: CreateShipmentInput = {
  originZip: '00000',
  destinationZip: '11111',
  weight: 1,
  dimensions: { length: 1, width: 1, height: 1 },
  serviceType: 'standard',
};

describe('CircuitBreakerProviderDecorator', () => {
  it('should open the circuit after configured failure threshold', async () => {
    const provider = new TestProvider();
    const breaker = new CircuitBreakerProviderDecorator(provider, {
      failureRateThreshold: 0.5,
      minimumRequestThreshold: 2,
      rollingWindowMs: 1_000,
      numberOfBuckets: 2,
      openStateDelayMs: 100,
      halfOpenMaxCalls: 1,
    });

    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('should move to half-open and close after successful probe', async () => {
    const provider = new TestProvider();
    const breaker = new CircuitBreakerProviderDecorator(provider, {
      failureRateThreshold: 0.5,
      minimumRequestThreshold: 2,
      rollingWindowMs: 1_000,
      numberOfBuckets: 2,
      openStateDelayMs: 15,
      halfOpenMaxCalls: 1,
    });

    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(CircuitOpenError);

    provider.fail = false;
    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(breaker.quote(input)).resolves.toHaveLength(1);
    await expect(breaker.quote(input)).resolves.toHaveLength(1);
  });

  it('should reopen if half-open probe fails', async () => {
    const provider = new TestProvider();
    const breaker = new CircuitBreakerProviderDecorator(provider, {
      failureRateThreshold: 0.5,
      minimumRequestThreshold: 2,
      rollingWindowMs: 1_000,
      numberOfBuckets: 2,
      openStateDelayMs: 15,
      halfOpenMaxCalls: 1,
    });

    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(ProviderError);
    await expect(breaker.quote(input)).rejects.toBeInstanceOf(CircuitOpenError);
  });
});