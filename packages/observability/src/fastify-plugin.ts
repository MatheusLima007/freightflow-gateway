import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import { correlationIdContext, logger } from './logger';

export default fp(async function observabilityPlugin(fastify: FastifyInstance) {
  // Middleware to inject correlationId from header or create a new one
  fastify.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    const headerCorrelId = request.headers['x-correlation-id'];
    const correlationId = (Array.isArray(headerCorrelId) ? headerCorrelId[0] : headerCorrelId) || randomUUID();
    
    // Set for response
    reply.header('x-correlation-id', correlationId);

    // Run the rest of the request within the ALS context
    correlationIdContext.run(correlationId, () => {
      request.log = logger.child({ reqId: request.id }); // optional: bind req logger if needed
      done();
    });
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: Math.round(reply.elapsedTime),
    }, 'Request completed');
    done();
  });
});

export { correlationIdContext, logger };

