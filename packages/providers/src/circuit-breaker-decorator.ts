import { CreateShipmentInput, CreateShipmentOutput, ICarrierProvider, LabelNormalized, QuoteNormalized, TrackingNormalized } from '@freightflow/core';
import { incrementCounter, logger } from '@freightflow/observability';
import { CircuitOpenError, RollingWindowCircuitBreaker } from '@freightflow/reliability';
import { getProviderSandboxProfileName } from './sandbox';

export { CircuitOpenError };

export interface CircuitBreakerOptions {
  failureRateThreshold: number;
  minimumRequestThreshold: number;
  rollingWindowMs: number;
  numberOfBuckets: number;
  openStateDelayMs: number;
  halfOpenMaxCalls: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureRateThreshold: 0.5,
  minimumRequestThreshold: 20,
  rollingWindowMs: 30_000,
  numberOfBuckets: 10,
  openStateDelayMs: 15_000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreakerProviderDecorator implements ICarrierProvider {
  private readonly circuits: Map<string, RollingWindowCircuitBreaker> = new Map();

  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly provider: ICarrierProvider,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get id(): string {
    return this.provider.id;
  }

  private getCircuit(operation: string): RollingWindowCircuitBreaker {
    const existing = this.circuits.get(operation);
    if (existing) {
      return existing;
    }

    const circuit = new RollingWindowCircuitBreaker({
      failureRateThreshold: this.options.failureRateThreshold,
      minimumRequestThreshold: this.options.minimumRequestThreshold,
      rollingWindowMs: this.options.rollingWindowMs,
      numberOfBuckets: this.options.numberOfBuckets,
      openStateDelayMs: this.options.openStateDelayMs,
      halfOpenMaxCalls: this.options.halfOpenMaxCalls,
    });
    this.circuits.set(operation, circuit);
    return circuit;
  }

  private shouldCountAsFailure(error: unknown): boolean {
    if (!error || typeof error !== 'object') return true;

    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof maybeStatusCode !== 'number') return true;

    return maybeStatusCode >= 500 || maybeStatusCode === 429;
  }

  private logTransition(operation: string, previousState: string, nextState: string, event: 'allow' | 'success' | 'failure') {
    if (previousState === nextState) {
      return;
    }

    const snapshot = this.getCircuit(operation).getSnapshot();
    const profile = getProviderSandboxProfileName(this.id);
    const payload = {
      providerId: this.id,
      operation,
      profile,
      previousState,
      nextState,
      event,
      failureRate: snapshot.failureRate,
      totalRequests: snapshot.totalRequests,
      totalFailures: snapshot.totalFailures,
      halfOpenInFlight: snapshot.halfOpenInFlight,
    };

    if (nextState === 'OPEN') {
      incrementCounter('breaker_open_total', { providerId: this.id, operation, profile });
      logger.warn(payload, 'Circuit transitioned to OPEN');
      return;
    }

    logger.info(payload, `Circuit transitioned to ${nextState}`);
  }

  private async execute<T>(operation: string, action: () => Promise<T>): Promise<T> {
    const circuit = this.getCircuit(operation);
    const stateBeforeAllow = circuit.getState();
    try {
      circuit.assertRequestAllowed();
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        incrementCounter('breaker_short_circuit_total', { providerId: this.id, operation, profile: getProviderSandboxProfileName(this.id) });
        throw new CircuitOpenError(`Circuit is open for provider ${this.id} on operation ${operation}`);
      }
      throw error;
    }
    this.logTransition(operation, stateBeforeAllow, circuit.getState(), 'allow');

    try {
      const result = await action();
      const stateBeforeSuccess = circuit.getState();
      circuit.onSuccess();
      this.logTransition(operation, stateBeforeSuccess, circuit.getState(), 'success');
      return result;
    } catch (error) {
      if (this.shouldCountAsFailure(error)) {
        const profile = getProviderSandboxProfileName(this.id);
        const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : 'unknown';
        incrementCounter('provider_errors_total', { providerId: this.id, operation, profile, statusCode });
        const stateBeforeFailure = circuit.getState();
        circuit.onFailure();
        this.logTransition(operation, stateBeforeFailure, circuit.getState(), 'failure');
      } else {
        circuit.onBypassHalfOpen();
      }
      throw error;
    }
  }

  async quote(input: CreateShipmentInput): Promise<QuoteNormalized[]> {
    return this.execute('quote', () => this.provider.quote(input));
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    return this.execute('createShipment', () => this.provider.createShipment(input));
  }

  async createLabel(shipmentId: string): Promise<LabelNormalized> {
    return this.execute('createLabel', () => this.provider.createLabel(shipmentId));
  }

  async track(trackingCode: string): Promise<TrackingNormalized> {
    return this.execute('track', () => this.provider.track(trackingCode));
  }
}