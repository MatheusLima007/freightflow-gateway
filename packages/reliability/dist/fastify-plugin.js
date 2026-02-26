"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const observability_1 = require("@freightflow/observability");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const idempotency_1 = require("./idempotency");
function stableHash(payload) {
    if (!payload)
        return (0, idempotency_1.hashPayload)('');
    if (typeof payload === 'object') {
        const sorted = Object.keys(payload).sort().reduce((acc, key) => {
            acc[key] = payload[key];
            return acc;
        }, {});
        return (0, idempotency_1.hashPayload)(JSON.stringify(sorted));
    }
    return (0, idempotency_1.hashPayload)(payload);
}
exports.default = (0, fastify_plugin_1.default)(async function idempotencyPlugin(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH')
            return;
        const key = request.headers['idempotency-key'];
        if (!key)
            return; // Optional logic: let route handle or skip
        const currentHash = stableHash(request.body);
        const result = await (0, idempotency_1.acquireIdempotencyKey)(key, currentHash);
        if (result.status === 'CONFLICT') {
            observability_1.logger.warn({ key, currentHash }, 'Idempotency conflict');
            reply.status(409).send({
                error: 'Conflict',
                message: 'Idempotency key already used for a different payload or is currently processing'
            });
            return reply;
        }
        if (result.status === 'HIT') {
            observability_1.logger.info({ key }, 'Idempotency cache hit');
            reply.status(result.statusCode)
                .header('x-idempotent-replay', 'true')
                .send(result.responseBody);
            return reply;
        }
        // PROCEED: The route will execute
    });
    fastify.addHook('onSend', async (request, reply, payload) => {
        if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH')
            return;
        if (reply.hasHeader('x-idempotent-replay'))
            return;
        const key = request.headers['idempotency-key'];
        if (!key)
            return;
        if (reply.statusCode >= 500) {
            try {
                await (0, idempotency_1.abandonIdempotencyKey)(key);
            }
            catch (err) {
                observability_1.logger.error(err, 'Failed to release idempotency key after server error');
            }
            return;
        }
        if (reply.statusCode >= 200 && reply.statusCode < 500 && reply.statusCode !== 409) {
            try {
                const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
                await (0, idempotency_1.finishIdempotencyKey)(key, parsedPayload, reply.statusCode);
            }
            catch (err) {
                observability_1.logger.error(err, 'Failed to save idempotency key');
            }
        }
    });
});
//# sourceMappingURL=fastify-plugin.js.map