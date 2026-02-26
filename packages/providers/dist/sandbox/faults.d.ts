import { ErrorRates, FaultKind, SandboxOperation } from './types';
export declare class SandboxFaultError extends Error {
    code?: string;
    statusCode?: number;
    retryAfterSeconds?: number;
    transient: boolean;
    constructor(message: string, transient: boolean, options?: {
        code?: string;
        statusCode?: number;
        retryAfterSeconds?: number;
    });
}
export declare function mergeErrorRates(override?: Partial<ErrorRates>): ErrorRates;
export declare function pickFaultKind(random: number, rates: ErrorRates): FaultKind;
export declare function isTransientFault(faultKind: FaultKind): boolean;
export declare function makeFaultError(operation: SandboxOperation, providerId: string, fault: FaultKind, retryAfterSeconds?: number): SandboxFaultError;
//# sourceMappingURL=faults.d.ts.map