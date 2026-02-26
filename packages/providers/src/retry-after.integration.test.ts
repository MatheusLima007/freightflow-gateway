import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { describe, expect, it } from 'vitest';
import { RetryProviderDecorator } from './retry-decorator';

class RateLimitedProvider implements ICarrierProvider {
  id = 'LIMITED';
  calls = 0;

  async quote(_input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    this.calls += 1;
    if (this.calls === 1) {
      const error = new Error('rate limited') as Error & { statusCode?: number; retryAfterSeconds?: number };
      error.statusCode = 429;
      error.retryAfterSeconds = 0.01;
      throw error;
    }

    return [{
      providerId: this.id,
      serviceName: 'Rate limited recovered',
      price: 15,
      currency: 'USD',
      estimatedDays: 3,
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

describe('retry-after integration', () => {
  it('respeita Retry-After quando recebe 429', async () => {
    const provider = new RateLimitedProvider();
    const decorated = new RetryProviderDecorator(provider, 3, 1, 5, 5000);

    const startedAt = Date.now();
    const result = await decorated.quote(input);
    const elapsed = Date.now() - startedAt;

    expect(result).toHaveLength(1);
    expect(provider.calls).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(8);
  });
});
