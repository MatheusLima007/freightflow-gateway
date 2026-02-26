"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@freightflow/core");
const vitest_1 = require("vitest");
const circuit_breaker_decorator_1 = require("./circuit-breaker-decorator");
class TestProvider {
    id = 'TEST';
    fail = true;
    async quote(_input) {
        if (this.fail) {
            throw new core_1.ProviderError('Provider unavailable');
        }
        return [{
                providerId: this.id,
                serviceName: 'Test',
                price: 1,
                currency: 'USD',
                estimatedDays: 1,
            }];
    }
    async createShipment(_input) {
        throw new Error('not used');
    }
    async createLabel(_shipmentId) {
        throw new Error('not used');
    }
    async track(_trackingCode) {
        throw new Error('not used');
    }
}
const input = {
    originZip: '00000',
    destinationZip: '11111',
    weight: 1,
    dimensions: { length: 1, width: 1, height: 1 },
    serviceType: 'standard',
};
(0, vitest_1.describe)('CircuitBreakerProviderDecorator', () => {
    (0, vitest_1.it)('should open the circuit after configured failure threshold', async () => {
        const provider = new TestProvider();
        const breaker = new circuit_breaker_decorator_1.CircuitBreakerProviderDecorator(provider, {
            failureRateThreshold: 0.5,
            minimumRequestThreshold: 2,
            rollingWindowMs: 1_000,
            numberOfBuckets: 2,
            openStateDelayMs: 100,
            halfOpenMaxCalls: 1,
        });
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(circuit_breaker_decorator_1.CircuitOpenError);
    });
    (0, vitest_1.it)('should move to half-open and close after successful probe', async () => {
        const provider = new TestProvider();
        const breaker = new circuit_breaker_decorator_1.CircuitBreakerProviderDecorator(provider, {
            failureRateThreshold: 0.5,
            minimumRequestThreshold: 2,
            rollingWindowMs: 1_000,
            numberOfBuckets: 2,
            openStateDelayMs: 15,
            halfOpenMaxCalls: 1,
        });
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(circuit_breaker_decorator_1.CircuitOpenError);
        provider.fail = false;
        await new Promise((resolve) => setTimeout(resolve, 20));
        await (0, vitest_1.expect)(breaker.quote(input)).resolves.toHaveLength(1);
        await (0, vitest_1.expect)(breaker.quote(input)).resolves.toHaveLength(1);
    });
    (0, vitest_1.it)('should reopen if half-open probe fails', async () => {
        const provider = new TestProvider();
        const breaker = new circuit_breaker_decorator_1.CircuitBreakerProviderDecorator(provider, {
            failureRateThreshold: 0.5,
            minimumRequestThreshold: 2,
            rollingWindowMs: 1_000,
            numberOfBuckets: 2,
            openStateDelayMs: 15,
            halfOpenMaxCalls: 1,
        });
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await new Promise((resolve) => setTimeout(resolve, 20));
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(core_1.ProviderError);
        await (0, vitest_1.expect)(breaker.quote(input)).rejects.toBeInstanceOf(circuit_breaker_decorator_1.CircuitOpenError);
    });
});
//# sourceMappingURL=circuit-breaker-decorator.test.js.map