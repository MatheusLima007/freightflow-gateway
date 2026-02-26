import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, INormalizer, LabelNormalized, ProviderError, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { randomUUID } from 'crypto';
import { ProviderSandboxEngine } from './sandbox';

interface RocketRawQuote {
  expressService?: boolean;
  totalFreight: number;
  deliveryEstimate: number; // in hours
}

class RocketQuoteNormalizer implements INormalizer<RocketRawQuote, QuoteNormalized> {
  normalize(raw: RocketRawQuote): QuoteNormalized {
    return {
      providerId: 'ROCKET',
      serviceName: raw.expressService ? 'Rocket Express' : 'Rocket Standard',
      price: raw.totalFreight,
      currency: 'USD',
      estimatedDays: Math.ceil(raw.deliveryEstimate / 24)
    };
  }
}

export class RocketShipCarrier implements ICarrierProvider {
  id = 'ROCKET';
  private quoteNormalizer = new RocketQuoteNormalizer();
  private readonly sandbox = new ProviderSandboxEngine(this.id, 29);

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    return this.sandbox.run('quote', async () => {
      const rawResponses: RocketRawQuote[] = [
        {
          expressService: true,
          totalFreight: input.weight * 3.0 + 20,
          deliveryEstimate: 24,
        }
      ];

      return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
    }, {
      mutatePayload: (payload) => payload.map((entry) => ({ ...entry, serviceName: `${entry.serviceName} (sandbox)` })),
    });
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    return this.sandbox.run('shipment', async () => {
      if (input.weight <= 0) {
        throw new ProviderError('RocketShip invalid weight', 'ROCKET_BAD_REQUEST');
      }

      return {
        shipmentId: `rs_${randomUUID()}`,
        providerId: this.id,
      };
    });
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    return this.sandbox.run('label', async () => ({
      shipmentId,
      trackingCode: `RS${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
      labelUrl: `https://api.rocketship.com/v1/labels/${shipmentId}`,
      format: 'ZPL',
    }));
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return this.sandbox.run('tracking', async () => {
      const now = new Date();
      return {
        trackingCode,
        status: 'PENDING',
        lastPolledAt: now,
        events: [
          { date: new Date(now.getTime() - 2 * 60 * 60 * 1000), description: 'Label created' },
          { date: new Date(now.getTime() - 60 * 60 * 1000), description: 'Picked up by carrier', location: 'Seattle, WA' },
        ]
      };
    }, {
      mutatePayload: (payload) => {
        const clone = {
          ...payload,
          events: [...payload.events],
        };

        if (clone.events.length > 1) {
          clone.events = [clone.events[1], clone.events[0], clone.events[1]];
        }

        return clone;
      },
    });
  }
}
