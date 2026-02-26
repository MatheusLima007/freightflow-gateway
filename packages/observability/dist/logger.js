"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.correlationIdContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const pino_1 = __importDefault(require("pino"));
// shared AsyncLocalStorage instance
exports.correlationIdContext = new node_async_hooks_1.AsyncLocalStorage();
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    mixin() {
        return {
            correlationId: exports.correlationIdContext.getStore() || 'unknown',
        };
    },
});
//# sourceMappingURL=logger.js.map