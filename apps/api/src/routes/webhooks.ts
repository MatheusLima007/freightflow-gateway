import { prisma } from '@freightflow/core';
import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';

const subscriptionSchema = {
  body: {
    type: 'object',
    required: ['url', 'events'],
    properties: {
      url: { type: 'string', format: 'uri' },
      secret: { type: 'string' },
      events: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

const dispatchSchema = {
  body: {
    type: 'object',
    required: ['shipmentId', 'status'],
    properties: {
      shipmentId: { type: 'string' },
      status: { type: 'string' },
      eventId: { type: 'string' }
    }
  }
};

export async function webhooksRoutes(app: FastifyInstance) {
  app.post<{ Body: { url: string; events: string[]; secret?: string } }>('/v1/webhooks/subscriptions', { schema: subscriptionSchema }, async (request, reply) => {
    const { url, events, secret } = request.body;
    const sub = await prisma.webhookSubscription.create({
      data: {
        url,
        events,
        secret
      }
    });
    return reply.status(201).send(sub);
  });

  app.post<{ Body: { shipmentId: string; status: string; eventId?: string } }>('/v1/simulations/dispatch', { schema: dispatchSchema }, async (request, reply) => {
    const { shipmentId, status, eventId } = request.body;
    const normalizedStatus = status.toLowerCase();
    const eventType = normalizedStatus.startsWith('shipment.') ? normalizedStatus : `shipment.${normalizedStatus}`;
    
    const subs = await prisma.webhookSubscription.findMany({
      where: {
        OR: [
          { events: { has: eventType } },
          { events: { has: 'shipment.*' } }
        ]
      }
    });
    
    const eventsToCreate = subs.map((sub: any) => {
      const resolvedEventId = eventId || randomUUID();
      return {
      subscriptionId: sub.id,
      eventId: resolvedEventId,
      shipmentId,
      status: 'pending',
      payload: {
        eventId: resolvedEventId,
        shipmentId,
        status,
        eventType,
        occurredAt: new Date().toISOString()
      },
    };
    });

    if (eventsToCreate.length > 0) {
      await prisma.webhookEvent.createMany({
        data: eventsToCreate
      });
    }

    return reply.status(202).send({ message: 'Simulation events registered for processing', count: eventsToCreate.length });
  });
}
