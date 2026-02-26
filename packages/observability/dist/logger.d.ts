import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
export declare const correlationIdContext: AsyncLocalStorage<string>;
export declare const logger: pino.Logger<never, boolean>;
//# sourceMappingURL=logger.d.ts.map