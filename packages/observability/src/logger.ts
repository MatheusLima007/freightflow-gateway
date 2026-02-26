import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

// shared AsyncLocalStorage instance
export const correlationIdContext = new AsyncLocalStorage<string>();

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  mixin() {
    return {
      correlationId: correlationIdContext.getStore() || 'unknown',
    };
  },
});
