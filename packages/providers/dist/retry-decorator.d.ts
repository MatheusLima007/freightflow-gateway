import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
export declare class RetryProviderDecorator implements ICarrierProvider {
    private readonly provider;
    private readonly maxRetries;
    private readonly baseDelayMs;
    constructor(provider: ICarrierProvider, maxRetries?: number, baseDelayMs?: number);
    get id(): string;
    private isRetryable;
    private getJitterDelay;
    private withRetry;
    quote(input: CreateShipmentInput): Promise<QuoteNormalized[]>;
    createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput>;
    createLabel(shipmentId: string): Promise<LabelNormalized>;
    track(trackingCode: string): Promise<TrackingNormalized>;
}
//# sourceMappingURL=retry-decorator.d.ts.map