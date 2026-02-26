import { prisma } from '@freightflow/core';
import { incrementCounter, logger } from '@freightflow/observability';
import { getSandboxSettings } from '@freightflow/providers';
import { calculateExponentialBackoff, CircuitOpenError, RollingWindowCircuitBreaker } from '@freightflow/reliability';
import { createHmac } from 'crypto';
import { buildEventPlan } from './webhook-chaos';
const MAX_ATTEMPTS = 5;
const FETCH_TIMEOUT_MS = 5000;
let isProcessing = false;
const webhookCircuits = new Map<string, RollingWindowCircuitBreaker>();
const sandboxSettings = getSandboxSettings();

function getWebhookCircuit(subscriptionId: string): RollingWindowCircuitBreaker {
  const existing = webhookCircuits.get(subscriptionId);
  if (existing) {
    return existing;
  }

  const circuit = new RollingWindowCircuitBreaker({
    failureRateThreshold: 0.5,
    minimumRequestThreshold: 10,
    rollingWindowMs: 30_000,
    numberOfBuckets: 10,
    openStateDelayMs: 15_000,
    halfOpenMaxCalls: 2,
  });
  webhookCircuits.set(subscriptionId, circuit);
  return circuit;
}

function isRetryableWebhookFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true;

  const maybeStatus = (error as { statusCode?: unknown }).statusCode;
  if (typeof maybeStatus === 'number') {
    if (maybeStatus === 429 || maybeStatus >= 500) {
      return true;
    }
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === 'string') {
    return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNABORTED'].includes(maybeCode);
  }

  return true;
}

function getNextAttemptDelay(attempts: number) {
  return calculateExponentialBackoff({
    attempt: attempts + 1,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
    jitter: 'equal',
  });
}

function retryDelayFromError(error: unknown, attempts: number): number {
  const retryAfterSeconds = Number((error as { retryAfterSeconds?: number })?.retryAfterSeconds);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return getNextAttemptDelay(attempts);
}

async function deliverWebhook(subscription: any, payload: Record<string, unknown>): Promise<Response> {
  const payloadString = JSON.stringify(payload);
  const signature = subscription.secret
    ? createHmac('sha256', subscription.secret).update(payloadString).digest('hex')
    : '';

  return fetch(subscription.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'x-webhook-signature': signature } : {})
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    body: payloadString
  });
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
      orderBy: [
        { subscriptionId: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 50
    });

    if (events.length === 0) {
      return;
    }

    logger.info({ count: events.length }, 'Found webhook events to process');

    const plan = buildEventPlan(events);

    for (const planned of plan) {
      const { event, drop, duplicate, duplicateWithNewEventId, profile } = planned;
      const { subscription, payload } = event;
      const isLastAttempt = event.attempts >= MAX_ATTEMPTS - 1;
      const circuit = getWebhookCircuit(subscription.id);

      if (drop) {
        incrementCounter('webhook_chaos_drop_total', { subscriptionId: subscription.id, profile });
        logger.warn({ eventId: event.id, profile, subscriptionId: subscription.id }, 'Webhook dropped by sandbox chaos policy');
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'failed',
            attempts: event.attempts + 1,
          }
        });
        continue;
      }

      let deliveryAttempts = 0;

      try {
        const stateBeforeAllow = circuit.getState();
        circuit.assertRequestAllowed();

        if (stateBeforeAllow !== circuit.getState()) {
          logger.info({ subscriptionId: subscription.id, previousState: stateBeforeAllow, nextState: circuit.getState() }, 'Webhook circuit state changed before delivery');
        }

        deliveryAttempts += 1;
        const res = await deliverWebhook(subscription, payload as Record<string, unknown>);

        if (res.ok) {
          const stateBeforeSuccess = circuit.getState();
          circuit.onSuccess();

          if (stateBeforeSuccess !== circuit.getState()) {
            logger.info({ subscriptionId: subscription.id, previousState: stateBeforeSuccess, nextState: circuit.getState() }, 'Webhook circuit state changed after success');
          }

          // Success
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: 'delivered',
              attempts: event.attempts + deliveryAttempts
            }
          });
          incrementCounter('webhook_delivery_total', { profile, outcome: 'success' });
          logger.info({ eventId: event.id, url: subscription.url, profile, attempt: event.attempts + 1 }, 'Webhook delivered successfully');

          if (duplicate) {
            const duplicatedPayload = {
              ...(payload as Record<string, unknown>),
              eventId: duplicateWithNewEventId
                ? `${String((payload as any)?.eventId ?? event.eventId)}-dup-${event.attempts + 1}`
                : (payload as any)?.eventId ?? event.eventId,
            };

            try {
              deliveryAttempts += 1;
              const duplicateResponse = await deliverWebhook(subscription, duplicatedPayload);
              incrementCounter('webhook_chaos_duplicate_total', {
                profile,
                duplicateMode: duplicateWithNewEventId ? 'newEventId' : 'sameEventId',
                outcome: duplicateResponse.ok ? 'success' : `http_${duplicateResponse.status}`,
              });
              logger.info(
                {
                  eventId: event.id,
                  profile,
                  duplicateMode: duplicateWithNewEventId ? 'newEventId' : 'sameEventId',
                  duplicateStatus: duplicateResponse.status,
                },
                'Webhook duplicate delivery executed'
              );

              await prisma.webhookEvent.update({
                where: { id: event.id },
                data: {
                  attempts: event.attempts + deliveryAttempts,
                }
              });
            } catch (duplicateError) {
              incrementCounter('webhook_chaos_duplicate_total', {
                profile,
                duplicateMode: duplicateWithNewEventId ? 'newEventId' : 'sameEventId',
                outcome: 'error',
              });
              logger.warn(
                {
                  eventId: event.id,
                  profile,
                  duplicateMode: duplicateWithNewEventId ? 'newEventId' : 'sameEventId',
                  err: duplicateError instanceof Error ? duplicateError.message : String(duplicateError),
                },
                'Duplicate webhook delivery failed'
              );
            }
          }
        } else {
          const error = new Error(`HTTP Error ${res.status}`) as Error & { statusCode?: number };
          error.statusCode = res.status;

          const retryAfterHeader = res.headers.get('retry-after');
          const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
          if (Number.isFinite(retryAfterSeconds)) {
            (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds = retryAfterSeconds;
          }

          throw error;
        }
      } catch (err: any) {
        if (err instanceof CircuitOpenError) {
          const delay = getNextAttemptDelay(event.attempts);
          const nextAttemptAt = new Date(Date.now() + delay);

          logger.warn({ eventId: event.id, subscriptionId: subscription.id, delayMs: delay }, 'Webhook skipped because circuit is open');
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: 'pending',
              nextAttemptAt,
            }
          });
          continue;
        }

        const retryable = isRetryableWebhookFailure(err);
        if (retryable) {
          const stateBeforeFailure = circuit.getState();
          circuit.onFailure();
          if (stateBeforeFailure !== circuit.getState()) {
            logger.warn({ subscriptionId: subscription.id, previousState: stateBeforeFailure, nextState: circuit.getState() }, 'Webhook circuit state changed after failure');
          }
        }

        logger.warn({ eventId: event.id, err: err.message, retryable, profile, attempt: event.attempts + 1 }, 'Webhook delivery failed');
        incrementCounter('webhook_delivery_total', { profile, outcome: retryable ? 'retryable_error' : 'permanent_error' });
        
        const shouldRetry = retryable && !isLastAttempt;
        const nextStatus = shouldRetry ? 'pending' : 'failed';
        const nextAttemptAt = shouldRetry ? new Date(Date.now() + retryDelayFromError(err, event.attempts)) : null;

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: nextStatus,
            attempts: event.attempts + Math.max(1, deliveryAttempts),
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
