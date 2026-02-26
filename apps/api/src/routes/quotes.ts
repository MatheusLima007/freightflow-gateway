import { CreateShipmentInput } from '@freightflow/core';
import { defaultSelector } from '@freightflow/providers';
import { FastifyInstance } from 'fastify';

const quoteSchema = {
  body: {
    type: 'object',
    required: ['originZip', 'destinationZip', 'weight', 'dimensions', 'serviceType'],
    properties: {
      originZip: { type: 'string' },
      destinationZip: { type: 'string' },
      weight: { type: 'number', minimum: 0.1 },
      dimensions: {
        type: 'object',
        required: ['length', 'width', 'height'],
        properties: {
          length: { type: 'number', minimum: 0.1 },
          width: { type: 'number', minimum: 0.1 },
          height: { type: 'number', minimum: 0.1 }
        }
      },
      serviceType: { type: 'string' }
    }
  }
};

export async function quotesRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateShipmentInput }>('/v1/quotes', { schema: quoteSchema }, async (request, reply) => {
    const input = request.body;
    
    // Fan-out to all providers to get quotes
    const providers = defaultSelector.getAllProviders();
    const quotesPromises = providers.map((p: any) => p.quote(input).catch((err: any) => {
      request.log.warn({ providerId: p.id, err }, 'Provider failed to return quote');
      return []; // Return empty array on failure so one provider doesn't break all
    }));

    const results = await Promise.all(quotesPromises);
    const flattenedQuotes = results.flat();

    return reply.status(200).send({
      quotes: flattenedQuotes
    });
  });
}
