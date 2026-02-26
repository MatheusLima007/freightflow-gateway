export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class ProviderError extends AppError {
    constructor(message?: string, code?: string);
}
//# sourceMappingURL=errors.d.ts.map