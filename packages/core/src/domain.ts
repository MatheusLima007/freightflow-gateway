export interface QuoteNormalized {
  providerId: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDays: number;
}

export interface LabelNormalized {
  shipmentId: string;
  trackingCode: string;
  labelUrl: string;
  format: 'PDF' | 'ZPL';
}

export interface TrackingNormalized {
  trackingCode: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION';
  lastPolledAt: Date;
  events: Array<{
    date: Date;
    description: string;
    location?: string;
  }>;
}

export interface CreateShipmentInput {
  originZip: string;
  destinationZip: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  serviceType: string;
}

export interface CreateShipmentOutput {
  shipmentId: string;
  providerId: string;
}

export interface ICarrierProvider {
  id: string;
  quote(input: CreateShipmentInput): Promise<QuoteNormalized[]>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput>;
  createLabel(shipmentId: string): Promise<LabelNormalized>;
  track(trackingCode: string): Promise<TrackingNormalized>;
}

export interface IRoutingStrategy {
  select(input: CreateShipmentInput, availableProviders: Map<string, ICarrierProvider>): ICarrierProvider;
}

export interface INormalizer<Raw, Normalized> {
  normalize(raw: Raw): Normalized;
}
