"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupErrorHandler = setupErrorHandler;
const errors_1 = require("@freightflow/core/dist/errors");
const observability_1 = require("@freightflow/observability");
function setupErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        observability_1.logger.error(error, `Request failed: ${error.message}`);
        // problem+json format
        const problem = {
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            detail: error.message,
            instance: request.url,
            correlationId: reply.getHeader('x-correlation-id')
        };
        if (error instanceof errors_1.AppError) {
            problem.title = error.code;
            problem.status = error.statusCode;
        }
        else if (error.statusCode) {
            // standard fastify HTTP errors (like 400 validation error)
            problem.status = error.statusCode;
            problem.title = error.code || 'BAD_REQUEST';
        }
        reply.status(problem.status)
            .header('Content-Type', 'application/problem+json')
            .send(problem);
    });
}
//# sourceMappingURL=error-handler.js.map