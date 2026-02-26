import { defaultSelector } from '@freightflow/providers';
import { FastifyInstance } from 'fastify';

const trackingSchema = {
  params: {
    type: 'object',
    required: ['trackingCode'],
    properties: {
      trackingCode: { type: 'string', minLength: 3 }
    }
  }
};

export async function trackingsRoutes(app: FastifyInstance) {
  app.get<{ Params: { trackingCode: string } }>('/v1/trackings/:trackingCode', { schema: trackingSchema }, async (request, reply) => {
    const trackingCode = request.params.trackingCode;
    
    // For simplicity of MVP without db mappings:
    // Try to guess provider based on tracking code format
    // ACME usually starts with 1Z, RocketShip with RS
    let providerId = 'ACME';
    if (trackingCode.startsWith('RS')) {
      providerId = 'ROCKET';
    }

    const provider = defaultSelector.getProvider(providerId);
    const tracking = await provider.track(trackingCode);

    return reply.status(200).send(tracking);
  });
}
