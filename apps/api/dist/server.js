"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const observability_1 = require("@freightflow/observability");
const fastify_1 = __importDefault(require("fastify"));
const error_handler_1 = require("./error-handler");
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: false // we handle logs inside fastify-plugin.ts manually
    });
    app.register(observability_1.observabilityPlugin);
    app.register(require('@freightflow/reliability').idempotencyPlugin);
    (0, error_handler_1.setupErrorHandler)(app);
    app.get('/health', async (request, reply) => {
        return { status: 'ok', time: new Date().toISOString() };
    });
    app.register(require('./routes/quotes').quotesRoutes);
    app.register(require('./routes/shipments').shipmentsRoutes);
    app.register(require('./routes/trackings').trackingsRoutes);
    app.register(require('./routes/webhooks').webhooksRoutes);
    return app;
}
if (require.main === module) {
    buildApp().then(app => {
        app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
            if (err) {
                observability_1.logger.error(err);
                process.exit(1);
            }
            observability_1.logger.info(`Server listening at ${address}`);
        });
    });
}
//# sourceMappingURL=server.js.map