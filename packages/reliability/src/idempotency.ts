import { prisma } from '@freightflow/core';
import crypto from 'crypto';

const PROCESSING_STATUS_CODE = 0;
const DEFAULT_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

export function hashPayload(payload: any): string {
  if (!payload) return '';
  const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function acquireIdempotencyKey(
  key: string,
  payloadHash: string,
  processingTimeoutMs: number = DEFAULT_PROCESSING_TIMEOUT_MS
): Promise<{ status: 'HIT' | 'CONFLICT' | 'PROCEED', responseBody?: any, statusCode?: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Acquire transaction-level advisory lock
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}));`;

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
        } else {
          // If it's still being processed, we should technically wait or return a 409/425.
          // For this implementation, we will treat it as a conflict.
          return { status: 'CONFLICT' };
        }
      } else {
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

export async function finishIdempotencyKey(key: string, responseBody: any, statusCode: number) {
  return prisma.idempotencyKey.update({
    where: { key },
    data: {
      responseBody,
      statusCode
    }
  });
}

export async function abandonIdempotencyKey(key: string) {
  return prisma.idempotencyKey.deleteMany({
    where: {
      key,
      statusCode: PROCESSING_STATUS_CODE,
    }
  });
}
