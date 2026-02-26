"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTrackingEvents = normalizeTrackingEvents;
exports.trackingsRoutes = trackingsRoutes;
const providers_1 = require("@freightflow/providers");
const trackingSchema = {
    params: {
        type: 'object',
        required: ['trackingCode'],
        properties: {
            trackingCode: { type: 'string', minLength: 3 }
        }
    }
};
function normalizeTrackingEvents(events) {
    const ordered = [...events].sort((left, right) => left.date.getTime() - right.date.getTime());
    const seen = new Set();
    const deduped = [];
    for (const event of ordered) {
        const key = event.eventId
            ? `eventId:${event.eventId}`
            : `composite:${event.description}|${event.date.toISOString()}|${event.location ?? ''}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(event);
    }
    return deduped;
}
async function trackingsRoutes(app) {
    app.get('/v1/trackings/:trackingCode', { schema: trackingSchema }, async (request, reply) => {
        const trackingCode = request.params.trackingCode;
        // For simplicity of MVP without db mappings:
        // Try to guess provider based on tracking code format
        // ACME usually starts with 1Z, RocketShip with RS
        let providerId = 'ACME';
        if (trackingCode.startsWith('RS')) {
            providerId = 'ROCKET';
        }
        const provider = providers_1.defaultSelector.getProvider(providerId);
        const tracking = await provider.track(trackingCode);
        const normalizedEvents = normalizeTrackingEvents(tracking.events.map((event) => ({
            date: event.date instanceof Date ? event.date : new Date(event.date),
            description: event.description,
            location: event.location,
            eventId: event.eventId,
        })));
        tracking.events = normalizedEvents.map(({ date, description, location }) => ({ date, description, location }));
        return reply.status(200).send(tracking);
    });
}
//# sourceMappingURL=trackings.js.map