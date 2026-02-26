import { CreateShipmentInput, NotFoundError, prisma } from '@freightflow/core';
import { defaultSelector } from '@freightflow/providers';
import { FastifyInstance } from 'fastify';

const shipmentSchema = {
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

const labelSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
};

export async function shipmentsRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateShipmentInput }>('/v1/shipments', { schema: shipmentSchema }, async (request, reply) => {
    const input = request.body;
    // Strategy selection
    const provider = defaultSelector.route(input);
    
    const result = await provider.createShipment(input);
    
    // Store ownership for labels securely in DB instead of in-memory map
    await prisma.shipment.create({
      data: {
        id: result.shipmentId,
        providerId: provider.id
      }
    });

    return reply.status(201).send(result);
  });

  app.post<{ Params: { id: string } }>('/v1/shipments/:id/label', { schema: labelSchema }, async (request, reply) => {
    const shipmentId = request.params.id;
    
    const shipmentRow = await prisma.shipment.findUnique({
      where: { id: shipmentId }
    });

    if (!shipmentRow) {
      throw new NotFoundError(`Shipment ${shipmentId} not found`);
    }

    const provider = defaultSelector.getProvider(shipmentRow.providerId);
    const labelResult = await provider.createLabel(shipmentId);

    return reply.status(201).send(labelResult);
  });
}
