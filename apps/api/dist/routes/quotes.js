"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesRoutes = quotesRoutes;
const providers_1 = require("@freightflow/providers");
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
async function quotesRoutes(app) {
    app.post('/v1/quotes', { schema: quoteSchema }, async (request, reply) => {
        const input = request.body;
        // Fan-out to all providers to get quotes
        const providers = providers_1.defaultSelector.getAllProviders();
        const quotesPromises = providers.map((p) => p.quote(input).catch((err) => {
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
//# sourceMappingURL=quotes.js.map