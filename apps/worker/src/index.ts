import { prisma } from '@freightflow/core';
import { logger } from '@freightflow/observability';
import { createHmac } from 'crypto';
const MAX_ATTEMPTS = 5;
const FETCH_TIMEOUT_MS = 5000;
let isProcessing = false;

// Basic backoff: 2s, 4s, 8s, 16s...
function getNextAttemptDelay(attempts: number) {
  const baseDelay = Math.pow(2, attempts) * 1000;
  const jitterFactor = 0.5 + Math.random();
  return Math.round(baseDelay * jitterFactor);
}

async function processWebhooks() {
  if (isProcessing) {
    logger.warn('Skipping worker pass because previous pass is still running');
    return;
  }

  isProcessing = true;
  logger.info('Starting Webhook Worker pass');

  try {
    // Find pending events that are ready to be processed
    const events = await prisma.webhookEvent.findMany({
      where: {
        status: 'pending',
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: new Date() } }
        ]
      },
      include: {
        subscription: true
      },
      take: 50
    });

    if (events.length === 0) {
      return;
    }

    logger.info({ count: events.length }, 'Found webhook events to process');

    for (const event of events) {
      const { subscription, payload } = event;
      const isLastAttempt = event.attempts >= MAX_ATTEMPTS - 1;
      const payloadString = JSON.stringify(payload);

      try {
        const signature = subscription.secret
          ? createHmac('sha256', subscription.secret).update(payloadString).digest('hex')
          : '';

        const res = await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signature ? { 'x-webhook-signature': signature } : {})
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          body: payloadString
        });

        if (res.ok) {
          // Success
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: 'delivered',
              attempts: event.attempts + 1
            }
          });
          logger.info({ eventId: event.id, url: subscription.url }, 'Webhook delivered successfully');
        } else {
          throw new Error(`HTTP Error ${res.status}`);
        }
      } catch (err: any) {
        logger.warn({ eventId: event.id, err: err.message }, 'Webhook delivery failed');
        
        const nextStatus = isLastAttempt ? 'failed' : 'pending';
        const nextAttemptAt = isLastAttempt ? null : new Date(Date.now() + getNextAttemptDelay(event.attempts));

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: nextStatus,
            attempts: event.attempts + 1,
            nextAttemptAt
          }
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}

async function startWorker() {
  logger.info('Worker started...');
  // Poll every 5 seconds
  setInterval(() => {
    processWebhooks().catch(err => {
      logger.error(err, 'Error in worker loop');
    });
  }, 5000);
}

startWorker();
