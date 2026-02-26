import { AppError } from '@freightflow/core/dist/errors';
import { logger } from '@freightflow/observability';
import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    logger.error(error, `Request failed: ${error.message}`);
    
    // problem+json format
    const problem = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
      instance: request.url,
      correlationId: reply.getHeader('x-correlation-id')
    };

    if (error instanceof AppError) {
      problem.title = error.code;
      problem.status = error.statusCode;
    } else if (error.statusCode) {
      // standard fastify HTTP errors (like 400 validation error)
      problem.status = error.statusCode;
      problem.title = error.code || 'BAD_REQUEST';
    }

    reply.status(problem.status)
      .header('Content-Type', 'application/problem+json')
      .send(problem);
  });
}
