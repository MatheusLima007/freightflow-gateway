import { logger } from '@freightflow/observability';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { abandonIdempotencyKey, acquireIdempotencyKey, finishIdempotencyKey, hashPayload } from './idempotency';

function stableHash(payload: any): string {
  if (!payload) return hashPayload('');
  if (typeof payload === 'object') {
    const sorted = Object.keys(payload).sort().reduce((acc: any, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});
    return hashPayload(JSON.stringify(sorted));
  }
  return hashPayload(payload);
}

export default fp(async function idempotencyPlugin(fastify: FastifyInstance) {
  
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH') return;
    
    const key = request.headers['idempotency-key'] as string;
    if (!key) return; // Optional logic: let route handle or skip

    const currentHash = stableHash(request.body);
    const result = await acquireIdempotencyKey(key, currentHash);

    if (result.status === 'CONFLICT') {
      logger.warn({ key, currentHash }, 'Idempotency conflict');
      reply.status(409).send({
        error: 'Conflict',
        message: 'Idempotency key already used for a different payload or is currently processing'
      });
      return reply;
    }

    if (result.status === 'HIT') {
      logger.info({ key }, 'Idempotency cache hit');
      reply.status(result.statusCode!)
           .header('x-idempotent-replay', 'true')
           .send(result.responseBody);
      return reply;
    }
    
    // PROCEED: The route will execute
  });

  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: string) => {
    if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH') return;
    if (reply.hasHeader('x-idempotent-replay')) return;
    
    const key = request.headers['idempotency-key'] as string;
    if (!key) return;
    
    if (reply.statusCode >= 500) {
      try {
        await abandonIdempotencyKey(key);
      } catch (err) {
        logger.error(err, 'Failed to release idempotency key after server error');
      }
      return;
    }

    if (reply.statusCode >= 200 && reply.statusCode < 500 && reply.statusCode !== 409) {
      try {
        const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
        await finishIdempotencyKey(key, parsedPayload, reply.statusCode);
      } catch (err) {
        logger.error(err, 'Failed to save idempotency key');
      }
    }
  });

});
