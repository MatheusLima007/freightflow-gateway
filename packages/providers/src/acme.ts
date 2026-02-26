import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, INormalizer, LabelNormalized, ProviderError, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { randomUUID } from 'crypto';

interface AcmeRawQuote {
  service: string;
  cost: number;
  currencyCode: string;
  etaDays: number;
}

class AcmeQuoteNormalizer implements INormalizer<AcmeRawQuote, QuoteNormalized> {
  normalize(raw: AcmeRawQuote): QuoteNormalized {
    return {
      providerId: 'ACME',
      serviceName: raw.service,
      price: raw.cost,
      currency: raw.currencyCode,
      estimatedDays: raw.etaDays
    };
  }
}

export class AcmeCarrier implements ICarrierProvider {
  id = 'ACME';
  private quoteNormalizer = new AcmeQuoteNormalizer();

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    // 1. Simulate fetching raw data in the provider's specific proprietary format
    const rawResponses: AcmeRawQuote[] = [
      {
        service: 'Acme Standard',
        cost: input.weight * 1.5 + 10,
        currencyCode: 'USD',
        etaDays: 5
      }
    ];

    // 2. Normalize the proprietary format into the application's unified domain model
    return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    return {
      shipmentId: `acme_shp_${randomUUID()}`,
      providerId: this.id,
    };
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    // Simulate slow provider
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate random failures but less frequent, say 10%
    if (Math.random() < 0.1) {
      throw new ProviderError('Acme API Timeout');
    }

    return {
      shipmentId,
      trackingCode: `1Z${randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
      labelUrl: `https://acme.com/labels/${shipmentId}.pdf`,
      format: 'PDF',
    };
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return {
      trackingCode,
      status: 'IN_TRANSIT',
      lastPolledAt: new Date(),
      events: [
        { date: new Date(), description: 'Package departed facility', location: 'New York, NY' }
      ]
    };
  }
}
