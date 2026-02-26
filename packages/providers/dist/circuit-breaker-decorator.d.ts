import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { CircuitOpenError } from '@freightflow/reliability';
export { CircuitOpenError };
export interface CircuitBreakerOptions {
    failureRateThreshold: number;
    minimumRequestThreshold: number;
    rollingWindowMs: number;
    numberOfBuckets: number;
    openStateDelayMs: number;
    halfOpenMaxCalls: number;
}
export declare class CircuitBreakerProviderDecorator implements ICarrierProvider {
    private readonly provider;
    private readonly circuits;
    private readonly options;
    constructor(provider: ICarrierProvider, options?: Partial<CircuitBreakerOptions>);
    get id(): string;
    private getCircuit;
    private shouldCountAsFailure;
    private logTransition;
    private execute;
    quote(input: CreateShipmentInput): Promise<QuoteNormalized[]>;
    createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput>;
    createLabel(shipmentId: string): Promise<LabelNormalized>;
    track(trackingCode: string): Promise<TrackingNormalized>;
}
//# sourceMappingURL=circuit-breaker-decorator.d.ts.map