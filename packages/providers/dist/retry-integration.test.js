"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const retry_decorator_1 = require("./retry-decorator");
class FlakyThenHealthyProvider {
    id = 'FLAKY';
    calls = 0;
    async quote(_input) {
        this.calls += 1;
        if (this.calls < 3) {
            const error = new Error('temporary timeout');
            error.code = 'ETIMEDOUT';
            error.statusCode = 504;
            throw error;
        }
        return [{
                providerId: this.id,
                serviceName: 'Recovered',
                price: 11,
                currency: 'USD',
                estimatedDays: 2,
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
(0, vitest_1.describe)('retry integration', () => {
    (0, vitest_1.it)('recupera no cenário flaky com retries', async () => {
        const provider = new FlakyThenHealthyProvider();
        const decorated = new retry_decorator_1.RetryProviderDecorator(provider, 4, 1, 5, 1000);
        const result = await decorated.quote(input);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(provider.calls).toBe(3);
    });
});
//# sourceMappingURL=retry-integration.test.js.map