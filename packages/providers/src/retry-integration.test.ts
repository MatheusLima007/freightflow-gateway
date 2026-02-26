import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { describe, expect, it } from 'vitest';
import { RetryProviderDecorator } from './retry-decorator';

class FlakyThenHealthyProvider implements ICarrierProvider {
  id = 'FLAKY';
  calls = 0;

  async quote(_input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    this.calls += 1;
    if (this.calls < 3) {
      const error = new Error('temporary timeout') as Error & { code?: string; statusCode?: number };
      error.code = 'ETIMEDOUT';
      error.statusCode = 504;
      throw error;
    }

    return [{
      providerId: this.id,
      serviceName: 'Recovered',
      price: 11,
      currency: 'USD',
      estimatedDays: 2,
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

describe('retry integration', () => {
  it('recupera no cenário flaky com retries', async () => {
    const provider = new FlakyThenHealthyProvider();
    const decorated = new RetryProviderDecorator(provider, 4, 1, 5, 1000);

    const result = await decorated.quote(input);

    expect(result).toHaveLength(1);
    expect(provider.calls).toBe(3);
  });
});
