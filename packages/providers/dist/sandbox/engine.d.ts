import { SandboxOperation } from './types';
export declare class ProviderSandboxEngine {
    private readonly providerId;
    private readonly rng;
    constructor(providerId: string, seedOffset?: number);
    private computeLatency;
    run<T>(operation: SandboxOperation, action: () => Promise<T>, options?: {
        mutatePayload?: (value: T) => T;
    }): Promise<T>;
    maybe<T>(probability: number, values: T[]): T[];
    should(probability: number): boolean;
}
//# sourceMappingURL=engine.d.ts.map