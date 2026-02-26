import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, INormalizer, LabelNormalized, ProviderError, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { randomUUID } from 'crypto';

interface RocketRawQuote {
  expressService: boolean;
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

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    const rawResponses: RocketRawQuote[] = [
      {
        expressService: true,
        totalFreight: input.weight * 3.0 + 20,
        deliveryEstimate: 24, // 1 day in hours
      }
    ];

    return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    // 30% chance of failing to demonstrate retry needs
    if (Math.random() < 0.3) {
      throw new ProviderError('RocketShip API Error: 503 Service Unavailable');
    }

    return {
      shipmentId: `rs_${randomUUID()}`,
      providerId: this.id,
    };
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    return {
      shipmentId,
      trackingCode: `RS${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
      labelUrl: `https://api.rocketship.com/v1/labels/${shipmentId}`,
      format: 'ZPL',
    };
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return {
      trackingCode,
      status: 'PENDING',
      lastPolledAt: new Date(),
      events: [
        { date: new Date(), description: 'Label created' }
      ]
    };
  }
}
