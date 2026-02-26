"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const retry_decorator_1 = require("./retry-decorator");
class RateLimitedProvider {
    id = 'LIMITED';
    calls = 0;
    async quote(_input) {
        this.calls += 1;
        if (this.calls === 1) {
            const error = new Error('rate limited');
            error.statusCode = 429;
            error.retryAfterSeconds = 0.01;
            throw error;
        }
        return [{
                providerId: this.id,
                serviceName: 'Rate limited recovered',
                price: 15,
                currency: 'USD',
                estimatedDays: 3,
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
(0, vitest_1.describe)('retry-after integration', () => {
    (0, vitest_1.it)('respeita Retry-After quando recebe 429', async () => {
        const provider = new RateLimitedProvider();
        const decorated = new retry_decorator_1.RetryProviderDecorator(provider, 3, 1, 5, 5000);
        const startedAt = Date.now();
        const result = await decorated.quote(input);
        const elapsed = Date.now() - startedAt;
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(provider.calls).toBe(2);
        (0, vitest_1.expect)(elapsed).toBeGreaterThanOrEqual(8);
    });
});
//# sourceMappingURL=retry-after.integration.test.js.map