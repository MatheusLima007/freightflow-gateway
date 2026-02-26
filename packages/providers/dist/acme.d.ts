import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
export declare class AcmeCarrier implements ICarrierProvider {
    id: string;
    private quoteNormalizer;
    private readonly sandbox;
    quote(input: CreateShipmentInput): Promise<QuoteNormalized[]>;
    createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput>;
    createLabel(shipmentId: string): Promise<LabelNormalized>;
    track(trackingCode: string): Promise<TrackingNormalized>;
}
//# sourceMappingURL=acme.d.ts.map