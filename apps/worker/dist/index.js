"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@freightflow/core");
const observability_1 = require("@freightflow/observability");
const reliability_1 = require("@freightflow/reliability");
const crypto_1 = require("crypto");
const MAX_ATTEMPTS = 5;
const FETCH_TIMEOUT_MS = 5000;
let isProcessing = false;
const webhookCircuits = new Map();
function getWebhookCircuit(subscriptionId) {
    const existing = webhookCircuits.get(subscriptionId);
    if (existing) {
        return existing;
    }
    const circuit = new reliability_1.RollingWindowCircuitBreaker({
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
function isRetryableWebhookFailure(error) {
    if (!error || typeof error !== 'object')
        return true;
    const maybeStatus = error.statusCode;
    if (typeof maybeStatus === 'number') {
        if (maybeStatus === 429 || maybeStatus >= 500) {
            return true;
        }
        return false;
    }
    const maybeCode = error.code;
    if (typeof maybeCode === 'string') {
        return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNABORTED'].includes(maybeCode);
    }
    return true;
}
function getNextAttemptDelay(attempts) {
    return (0, reliability_1.calculateExponentialBackoff)({
        attempt: attempts + 1,
        baseDelayMs: 1000,
        maxDelayMs: 30_000,
        jitter: 'equal',
    });
}
async function processWebhooks() {
    if (isProcessing) {
        observability_1.logger.warn('Skipping worker pass because previous pass is still running');
        return;
    }
    isProcessing = true;
    observability_1.logger.info('Starting Webhook Worker pass');
    try {
        // Find pending events that are ready to be processed
        const events = await core_1.prisma.webhookEvent.findMany({
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
        observability_1.logger.info({ count: events.length }, 'Found webhook events to process');
        for (const event of events) {
            const { subscription, payload } = event;
            const isLastAttempt = event.attempts >= MAX_ATTEMPTS - 1;
            const payloadString = JSON.stringify(payload);
            const circuit = getWebhookCircuit(subscription.id);
            try {
                const stateBeforeAllow = circuit.getState();
                circuit.assertRequestAllowed();
                if (stateBeforeAllow !== circuit.getState()) {
                    observability_1.logger.info({ subscriptionId: subscription.id, previousState: stateBeforeAllow, nextState: circuit.getState() }, 'Webhook circuit state changed before delivery');
                }
                const signature = subscription.secret
                    ? (0, crypto_1.createHmac)('sha256', subscription.secret).update(payloadString).digest('hex')
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
                    const stateBeforeSuccess = circuit.getState();
                    circuit.onSuccess();
                    if (stateBeforeSuccess !== circuit.getState()) {
                        observability_1.logger.info({ subscriptionId: subscription.id, previousState: stateBeforeSuccess, nextState: circuit.getState() }, 'Webhook circuit state changed after success');
                    }
                    // Success
                    await core_1.prisma.webhookEvent.update({
                        where: { id: event.id },
                        data: {
                            status: 'delivered',
                            attempts: event.attempts + 1
                        }
                    });
                    observability_1.logger.info({ eventId: event.id, url: subscription.url }, 'Webhook delivered successfully');
                }
                else {
                    const error = new Error(`HTTP Error ${res.status}`);
                    error.statusCode = res.status;
                    throw error;
                }
            }
            catch (err) {
                if (err instanceof reliability_1.CircuitOpenError) {
                    const delay = getNextAttemptDelay(event.attempts);
                    const nextAttemptAt = new Date(Date.now() + delay);
                    observability_1.logger.warn({ eventId: event.id, subscriptionId: subscription.id, delayMs: delay }, 'Webhook skipped because circuit is open');
                    await core_1.prisma.webhookEvent.update({
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
                        observability_1.logger.warn({ subscriptionId: subscription.id, previousState: stateBeforeFailure, nextState: circuit.getState() }, 'Webhook circuit state changed after failure');
                    }
                }
                observability_1.logger.warn({ eventId: event.id, err: err.message, retryable }, 'Webhook delivery failed');
                const shouldRetry = retryable && !isLastAttempt;
                const nextStatus = shouldRetry ? 'pending' : 'failed';
                const nextAttemptAt = shouldRetry ? new Date(Date.now() + getNextAttemptDelay(event.attempts)) : null;
                await core_1.prisma.webhookEvent.update({
                    where: { id: event.id },
                    data: {
                        status: nextStatus,
                        attempts: event.attempts + 1,
                        nextAttemptAt
                    }
                });
            }
        }
    }
    finally {
        isProcessing = false;
    }
}
async function startWorker() {
    observability_1.logger.info('Worker started...');
    // Poll every 5 seconds
    setInterval(() => {
        processWebhooks().catch(err => {
            observability_1.logger.error(err, 'Error in worker loop');
        });
    }, 5000);
}
startWorker();
//# sourceMappingURL=index.js.map