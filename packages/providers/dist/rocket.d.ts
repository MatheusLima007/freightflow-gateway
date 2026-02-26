import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
export declare class RocketShipCarrier implements ICarrierProvider {
    id: string;
    private quoteNormalizer;
    quote(input: CreateShipmentInput): Promise<QuoteNormalized[]>;
    createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput>;
    createLabel(shipmentId: string): Promise<LabelNormalized>;
    track(trackingCode: string): Promise<TrackingNormalized>;
}
//# sourceMappingURL=rocket.d.ts.map