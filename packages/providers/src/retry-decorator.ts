import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { incrementCounter, logger, observeHistogram } from '@freightflow/observability';
import { calculateExponentialBackoff, sleep } from '@freightflow/reliability';

export class RetryProviderDecorator implements ICarrierProvider {
  constructor(
    private readonly provider: ICarrierProvider,
    private readonly maxRetries: number = 3,
    private readonly baseDelayMs: number = 500,
    private readonly maxDelayMs: number = 30_000,
    private readonly maxRetryTimeMs: number = 5_000
  ) {}

  get id(): string {
    return this.provider.id;
  }

  private isRetryable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const maybeCode = (error as { code?: unknown }).code;
    if (maybeCode === 'CIRCUIT_OPEN') {
      return false;
    }

    if (typeof maybeCode === 'string') {
      const transientErrorCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNABORTED']);
      if (transientErrorCodes.has(maybeCode)) {
        return true;
      }
    }

    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof maybeStatusCode !== 'number') return false;

    if (maybeStatusCode >= 500 || maybeStatusCode === 429) {
      return true;
    }

    return false;
  }

  private async withRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;
    const startedAt = Date.now();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const attemptStartedAt = Date.now();
      try {
        const result = await operation();
        observeHistogram('request_latency_ms', Date.now() - attemptStartedAt, {
          providerId: this.id,
          operation: operationName,
          outcome: 'success',
        });
        return result;
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryable(error);
        incrementCounter('retry_attempts_total', {
          providerId: this.id,
          operation: operationName,
          retryable,
        });
        observeHistogram('request_latency_ms', Date.now() - attemptStartedAt, {
          providerId: this.id,
          operation: operationName,
          outcome: 'error',
        });

        logger.warn(
          { 
            providerId: this.id, 
            operation: operationName, 
            attempt, 
            maxRetries: this.maxRetries,
            retryable,
            error: error instanceof Error ? error.message : String(error)
          }, 
          'Provider operation failed, retrying...'
        );

        if (!retryable) {
          break;
        }
        
        if (attempt < this.maxRetries) {
          const elapsedMs = Date.now() - startedAt;
          if (elapsedMs >= this.maxRetryTimeMs) {
            logger.warn(
              {
                providerId: this.id,
                operation: operationName,
                elapsedMs,
                maxRetryTimeMs: this.maxRetryTimeMs,
              },
              'Retry budget exhausted before next attempt'
            );
            break;
          }

          const waitTime = calculateExponentialBackoff({
            attempt,
            baseDelayMs: this.baseDelayMs,
            maxDelayMs: this.maxDelayMs,
            jitter: 'equal',
          });

          logger.info({ providerId: this.id, operation: operationName, attempt, delayMs: waitTime }, 'Waiting before retry attempt');

          if (elapsedMs + waitTime > this.maxRetryTimeMs) {
            logger.warn(
              {
                providerId: this.id,
                operation: operationName,
                elapsedMs,
                waitTime,
                maxRetryTimeMs: this.maxRetryTimeMs,
              },
              'Skipping retry because it exceeds retry budget'
            );
            break;
          }

          await sleep(waitTime);
        }
      }
    }
    
    logger.error({ providerId: this.id, operation: operationName }, 'Provider operation failed after all retries');
    throw lastError;
  }

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    return this.withRetry('quote', () => this.provider.quote(input));
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    return this.withRetry('createShipment', () => this.provider.createShipment(input));
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    return this.withRetry('createLabel', () => this.provider.createLabel(shipmentId));
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return this.withRetry('track', () => this.provider.track(trackingCode));
  }
}
