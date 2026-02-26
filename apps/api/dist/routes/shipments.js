"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipmentsRoutes = shipmentsRoutes;
const core_1 = require("@freightflow/core");
const providers_1 = require("@freightflow/providers");
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
async function shipmentsRoutes(app) {
    app.post('/v1/shipments', { schema: shipmentSchema }, async (request, reply) => {
        const input = request.body;
        // Strategy selection
        const provider = providers_1.defaultSelector.route(input);
        const result = await provider.createShipment(input);
        // Store ownership for labels securely in DB instead of in-memory map
        await core_1.prisma.shipment.create({
            data: {
                id: result.shipmentId,
                providerId: provider.id
            }
        });
        return reply.status(201).send(result);
    });
    app.post('/v1/shipments/:id/label', { schema: labelSchema }, async (request, reply) => {
        const shipmentId = request.params.id;
        const shipmentRow = await core_1.prisma.shipment.findUnique({
            where: { id: shipmentId }
        });
        if (!shipmentRow) {
            throw new core_1.NotFoundError(`Shipment ${shipmentId} not found`);
        }
        const provider = providers_1.defaultSelector.getProvider(shipmentRow.providerId);
        const labelResult = await provider.createLabel(shipmentId);
        return reply.status(201).send(labelResult);
    });
}
//# sourceMappingURL=shipments.js.map