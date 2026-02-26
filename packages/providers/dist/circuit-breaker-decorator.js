"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerProviderDecorator = exports.CircuitOpenError = void 0;
const observability_1 = require("@freightflow/observability");
const reliability_1 = require("@freightflow/reliability");
Object.defineProperty(exports, "CircuitOpenError", { enumerable: true, get: function () { return reliability_1.CircuitOpenError; } });
const sandbox_1 = require("./sandbox");
const DEFAULT_OPTIONS = {
    failureRateThreshold: 0.5,
    minimumRequestThreshold: 20,
    rollingWindowMs: 30_000,
    numberOfBuckets: 10,
    openStateDelayMs: 15_000,
    halfOpenMaxCalls: 3,
};
class CircuitBreakerProviderDecorator {
    provider;
    circuits = new Map();
    options;
    constructor(provider, options = {}) {
        this.provider = provider;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    get id() {
        return this.provider.id;
    }
    getCircuit(operation) {
        const existing = this.circuits.get(operation);
        if (existing) {
            return existing;
        }
        const circuit = new reliability_1.RollingWindowCircuitBreaker({
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
    shouldCountAsFailure(error) {
        if (!error || typeof error !== 'object')
            return true;
        const maybeStatusCode = error.statusCode;
        if (typeof maybeStatusCode !== 'number')
            return true;
        return maybeStatusCode >= 500 || maybeStatusCode === 429;
    }
    logTransition(operation, previousState, nextState, event) {
        if (previousState === nextState) {
            return;
        }
        const snapshot = this.getCircuit(operation).getSnapshot();
        const profile = (0, sandbox_1.getProviderSandboxProfileName)(this.id);
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
            (0, observability_1.incrementCounter)('breaker_open_total', { providerId: this.id, operation, profile });
            observability_1.logger.warn(payload, 'Circuit transitioned to OPEN');
            return;
        }
        observability_1.logger.info(payload, `Circuit transitioned to ${nextState}`);
    }
    async execute(operation, action) {
        const circuit = this.getCircuit(operation);
        const stateBeforeAllow = circuit.getState();
        try {
            circuit.assertRequestAllowed();
        }
        catch (error) {
            if (error instanceof reliability_1.CircuitOpenError) {
                (0, observability_1.incrementCounter)('breaker_short_circuit_total', { providerId: this.id, operation, profile: (0, sandbox_1.getProviderSandboxProfileName)(this.id) });
                throw new reliability_1.CircuitOpenError(`Circuit is open for provider ${this.id} on operation ${operation}`);
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
        }
        catch (error) {
            if (this.shouldCountAsFailure(error)) {
                const profile = (0, sandbox_1.getProviderSandboxProfileName)(this.id);
                const statusCode = typeof error.statusCode === 'number'
                    ? error.statusCode
                    : 'unknown';
                (0, observability_1.incrementCounter)('provider_errors_total', { providerId: this.id, operation, profile, statusCode });
                const stateBeforeFailure = circuit.getState();
                circuit.onFailure();
                this.logTransition(operation, stateBeforeFailure, circuit.getState(), 'failure');
            }
            else {
                circuit.onBypassHalfOpen();
            }
            throw error;
        }
    }
    async quote(input) {
        return this.execute('quote', () => this.provider.quote(input));
    }
    async createShipment(input) {
        return this.execute('createShipment', () => this.provider.createShipment(input));
    }
    async createLabel(shipmentId) {
        return this.execute('createLabel', () => this.provider.createLabel(shipmentId));
    }
    async track(trackingCode) {
        return this.execute('track', () => this.provider.track(trackingCode));
    }
}
exports.CircuitBreakerProviderDecorator = CircuitBreakerProviderDecorator;
//# sourceMappingURL=circuit-breaker-decorator.js.map