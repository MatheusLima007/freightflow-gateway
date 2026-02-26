import { logger, observabilityPlugin } from '@freightflow/observability';
import Fastify from 'fastify';
import { setupErrorHandler } from './error-handler';

export async function buildApp() {
  const app = Fastify({
    logger: false // we handle logs inside fastify-plugin.ts manually
  });

  app.register(observabilityPlugin);
  app.register(require('@freightflow/reliability').idempotencyPlugin);

  setupErrorHandler(app);

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
        logger.error(err);
        process.exit(1);
      }
      logger.info(`Server listening at ${address}`);
    });
  });
}
