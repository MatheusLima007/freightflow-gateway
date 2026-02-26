"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const retry_decorator_1 = require("./retry-decorator");
class CounterProvider {
    id = 'COUNTER';
    calls = 0;
    errorToThrow = null;
    async quote(_input) {
        this.calls += 1;
        if (this.errorToThrow) {
            throw this.errorToThrow;
        }
        return [{
                providerId: this.id,
                serviceName: 'Counter',
                price: 10,
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
(0, vitest_1.describe)('RetryProviderDecorator', () => {
    (0, vitest_1.it)('should not retry when circuit is open', async () => {
        const provider = new CounterProvider();
        provider.errorToThrow = { statusCode: 503, code: 'CIRCUIT_OPEN', message: 'open' };
        const decorated = new retry_decorator_1.RetryProviderDecorator(provider, 3, 1, 1);
        await (0, vitest_1.expect)(decorated.quote(input)).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
        (0, vitest_1.expect)(provider.calls).toBe(1);
    });
    (0, vitest_1.it)('should retry transient failures until max retries', async () => {
        const provider = new CounterProvider();
        provider.errorToThrow = { statusCode: 503, code: 'PROVIDER_ERROR', message: 'temporary failure' };
        const decorated = new retry_decorator_1.RetryProviderDecorator(provider, 3, 1, 1);
        await (0, vitest_1.expect)(decorated.quote(input)).rejects.toMatchObject({ statusCode: 503 });
        (0, vitest_1.expect)(provider.calls).toBe(3);
    });
});
//# sourceMappingURL=retry-decorator.test.js.map