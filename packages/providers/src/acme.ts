import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, INormalizer, LabelNormalized, ProviderError, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { randomUUID } from 'crypto';
import { ProviderSandboxEngine } from './sandbox';

interface AcmeRawQuote {
  service: string;
  cost: number;
  currencyCode?: string;
  etaDays: number;
  meta?: Record<string, unknown>;
}

class AcmeQuoteNormalizer implements INormalizer<AcmeRawQuote, QuoteNormalized> {
  normalize(raw: AcmeRawQuote): QuoteNormalized {
    return {
      providerId: 'ACME',
      serviceName: raw.service,
      price: raw.cost,
      currency: raw.currencyCode ?? 'USD',
      estimatedDays: raw.etaDays
    };
  }
}

export class AcmeCarrier implements ICarrierProvider {
  id = 'ACME';
  private quoteNormalizer = new AcmeQuoteNormalizer();
  private readonly sandbox = new ProviderSandboxEngine(this.id, 11);

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    return this.sandbox.run('quote', async () => {
      const rawResponses: AcmeRawQuote[] = [
        {
          service: 'Acme Standard',
          cost: input.weight * 1.5 + 10,
          currencyCode: 'USD',
          etaDays: 5
        }
      ];

      return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
    });
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    return this.sandbox.run('shipment', async () => ({
      shipmentId: `acme_shp_${randomUUID()}`,
      providerId: this.id,
    }));
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    return this.sandbox.run('label', async () => {
      if (shipmentId.startsWith('invalid')) {
        throw new ProviderError('Acme invalid shipment id', 'ACME_BAD_REQUEST');
      }

      return {
        shipmentId,
        trackingCode: `1Z${randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
        labelUrl: `https://acme.com/labels/${shipmentId}.pdf`,
        format: 'PDF',
      };
    });
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return this.sandbox.run('tracking', async () => {
      const now = new Date();
      return {
        trackingCode,
        status: 'IN_TRANSIT',
        lastPolledAt: now,
        events: [
          { date: new Date(now.getTime() - 60 * 60 * 1000), description: 'Package received at facility', location: 'New York, NY' },
          { date: now, description: 'Package departed facility', location: 'New York, NY' }
        ]
      };
    }, {
      mutatePayload: (payload) => {
        const clone = {
          ...payload,
          events: [...payload.events],
        };

        if (clone.events.length > 0) {
          clone.events.push({ ...clone.events[0] });
          clone.events = clone.events.reverse();
        }

        return clone;
      }
    });
  }
}
