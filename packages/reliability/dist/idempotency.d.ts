export declare function hashPayload(payload: any): string;
export declare function acquireIdempotencyKey(key: string, payloadHash: string, processingTimeoutMs?: number): Promise<{
    status: 'HIT' | 'CONFLICT' | 'PROCEED';
    responseBody?: any;
    statusCode?: number;
}>;
export declare function finishIdempotencyKey(key: string, responseBody: any, statusCode: number): Promise<{
    key: string;
    payloadHash: string;
    responseBody: import("@prisma/client/runtime/library").JsonValue;
    statusCode: number;
    createdAt: Date;
}>;
export declare function abandonIdempotencyKey(key: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
//# sourceMappingURL=idempotency.d.ts.map