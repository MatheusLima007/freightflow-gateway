import { CreateShipmentInput, ICarrierProvider, IRoutingStrategy } from '@freightflow/core';
export declare class ZipPrefixRoutingStrategy implements IRoutingStrategy {
    select(input: CreateShipmentInput, availableProviders: Map<string, ICarrierProvider>): ICarrierProvider;
}
export declare class ProviderSelector {
    private providers;
    private routingStrategy;
    constructor(strategy: IRoutingStrategy);
    register(provider: ICarrierProvider): void;
    getProvider(id: string): ICarrierProvider;
    route(input: CreateShipmentInput): ICarrierProvider;
    getAllProviders(): ICarrierProvider[];
}
export declare const defaultSelector: ProviderSelector;
//# sourceMappingURL=selector.d.ts.map