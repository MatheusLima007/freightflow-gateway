"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPayload = hashPayload;
exports.acquireIdempotencyKey = acquireIdempotencyKey;
exports.finishIdempotencyKey = finishIdempotencyKey;
exports.abandonIdempotencyKey = abandonIdempotencyKey;
const core_1 = require("@freightflow/core");
const crypto_1 = __importDefault(require("crypto"));
const PROCESSING_STATUS_CODE = 0;
const DEFAULT_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
function hashPayload(payload) {
    if (!payload)
        return '';
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto_1.default.createHash('sha256').update(str).digest('hex');
}
async function acquireIdempotencyKey(key, payloadHash, processingTimeoutMs = DEFAULT_PROCESSING_TIMEOUT_MS) {
    return core_1.prisma.$transaction(async (tx) => {
        // 1. Acquire transaction-level advisory lock
        await tx.$queryRaw `SELECT pg_advisory_xact_lock(hashtext(${key}));`;
        // 2. Check if the key already exists
        const existing = await tx.idempotencyKey.findUnique({
            where: { key }
        });
        if (existing) {
            if (existing.payloadHash !== payloadHash) {
                return { status: 'CONFLICT' };
            }
            if (existing.statusCode === PROCESSING_STATUS_CODE) {
                const staleThreshold = Date.now() - processingTimeoutMs;
                if (existing.createdAt.getTime() <= staleThreshold) {
                    await tx.idempotencyKey.delete({ where: { key } });
                }
                else {
                    // If it's still being processed, we should technically wait or return a 409/425.
                    // For this implementation, we will treat it as a conflict.
                    return { status: 'CONFLICT' };
                }
            }
            else {
                return {
                    status: 'HIT',
                    responseBody: existing.responseBody,
                    statusCode: existing.statusCode
                };
            }
        }
        // 3. Insert 'processing' state (represented by statusCode = 0)
        await tx.idempotencyKey.create({
            data: {
                key,
                payloadHash,
                responseBody: {},
                statusCode: PROCESSING_STATUS_CODE,
            }
        });
        return { status: 'PROCEED' };
    });
}
async function finishIdempotencyKey(key, responseBody, statusCode) {
    return core_1.prisma.idempotencyKey.update({
        where: { key },
        data: {
            responseBody,
            statusCode
        }
    });
}
async function abandonIdempotencyKey(key) {
    return core_1.prisma.idempotencyKey.deleteMany({
        where: {
            key,
            statusCode: PROCESSING_STATUS_CODE,
        }
    });
}
//# sourceMappingURL=idempotency.js.map