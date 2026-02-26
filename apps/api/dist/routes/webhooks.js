"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRoutes = webhooksRoutes;
const core_1 = require("@freightflow/core");
const crypto_1 = require("crypto");
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
async function webhooksRoutes(app) {
    app.post('/v1/webhooks/subscriptions', { schema: subscriptionSchema }, async (request, reply) => {
        const { url, events, secret } = request.body;
        const sub = await core_1.prisma.webhookSubscription.create({
            data: {
                url,
                events,
                secret
            }
        });
        return reply.status(201).send(sub);
    });
    app.post('/v1/simulations/dispatch', { schema: dispatchSchema }, async (request, reply) => {
        const { shipmentId, status, eventId } = request.body;
        const normalizedStatus = status.toLowerCase();
        const eventType = normalizedStatus.startsWith('shipment.') ? normalizedStatus : `shipment.${normalizedStatus}`;
        const subs = await core_1.prisma.webhookSubscription.findMany({
            where: {
                OR: [
                    { events: { has: eventType } },
                    { events: { has: 'shipment.*' } }
                ]
            }
        });
        const eventsToCreate = subs.map((sub) => ({
            subscriptionId: sub.id,
            eventId: eventId || (0, crypto_1.randomUUID)(),
            shipmentId,
            status: 'pending',
            payload: {
                shipmentId,
                status,
                eventType,
                occurredAt: new Date().toISOString()
            },
        }));
        if (eventsToCreate.length > 0) {
            await core_1.prisma.webhookEvent.createMany({
                data: eventsToCreate
            });
        }
        return reply.status(202).send({ message: 'Simulation events registered for processing', count: eventsToCreate.length });
    });
}
//# sourceMappingURL=webhooks.js.map