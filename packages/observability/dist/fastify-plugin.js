"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.correlationIdContext = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const node_crypto_1 = require("node:crypto");
const logger_1 = require("./logger");
Object.defineProperty(exports, "correlationIdContext", { enumerable: true, get: function () { return logger_1.correlationIdContext; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
exports.default = (0, fastify_plugin_1.default)(async function observabilityPlugin(fastify) {
    // Middleware to inject correlationId from header or create a new one
    fastify.addHook('onRequest', (request, reply, done) => {
        const headerCorrelId = request.headers['x-correlation-id'];
        const correlationId = (Array.isArray(headerCorrelId) ? headerCorrelId[0] : headerCorrelId) || (0, node_crypto_1.randomUUID)();
        // Set for response
        reply.header('x-correlation-id', correlationId);
        // Run the rest of the request within the ALS context
        logger_1.correlationIdContext.run(correlationId, () => {
            request.log = logger_1.logger.child({ reqId: request.id }); // optional: bind req logger if needed
            done();
        });
    });
    fastify.addHook('onResponse', (request, reply, done) => {
        logger_1.logger.info({
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: Math.round(reply.elapsedTime),
        }, 'Request completed');
        done();
    });
});
//# sourceMappingURL=fastify-plugin.js.map