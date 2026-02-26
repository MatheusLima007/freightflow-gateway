import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { logger } from '@freightflow/observability';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class RetryProviderDecorator implements ICarrierProvider {
  constructor(
    private readonly provider: ICarrierProvider,
    private readonly maxRetries: number = 3,
    private readonly baseDelayMs: number = 500
  ) {}

  get id(): string {
    return this.provider.id;
  }

  private isRetryable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return true;

    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof maybeStatusCode !== 'number') return true;

    if (maybeStatusCode >= 500 || maybeStatusCode === 429) {
      return true;
    }

    return false;
  }

  private getJitterDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
    const jitterFactor = 0.5 + Math.random();
    return Math.round(exponentialDelay * jitterFactor);
  }

  private async withRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryable(error);

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
          const waitTime = this.getJitterDelay(attempt);
          await delay(waitTime);
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
