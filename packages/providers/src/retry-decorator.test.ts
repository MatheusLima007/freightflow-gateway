import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { describe, expect, it } from 'vitest';
import { RetryProviderDecorator } from './retry-decorator';

class CounterProvider implements ICarrierProvider {
  id = 'COUNTER';
  calls = 0;
  errorToThrow: unknown = null;

  async quote(_input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    this.calls += 1;
    if (this.errorToThrow) {
      throw this.errorToThrow;
    }

    return [{
      providerId: this.id,
      serviceName: 'Counter',
      price: 10,
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

describe('RetryProviderDecorator', () => {
  it('should not retry when circuit is open', async () => {
    const provider = new CounterProvider();
    provider.errorToThrow = { statusCode: 503, code: 'CIRCUIT_OPEN', message: 'open' };

    const decorated = new RetryProviderDecorator(provider, 3, 1, 1);

    await expect(decorated.quote(input)).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    expect(provider.calls).toBe(1);
  });

  it('should retry transient failures until max retries', async () => {
    const provider = new CounterProvider();
    provider.errorToThrow = { statusCode: 503, code: 'PROVIDER_ERROR', message: 'temporary failure' };

    const decorated = new RetryProviderDecorator(provider, 3, 1, 1);

    await expect(decorated.quote(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(provider.calls).toBe(3);
  });
});