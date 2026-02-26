"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rate_limit_1 = require("./rate-limit");
(0, vitest_1.describe)('sandbox rate limit', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, rate_limit_1.resetRateLimitBuckets)();
    });
    (0, vitest_1.it)('respeita burst inicial e passa a limitar com retry-after', () => {
        const config = { requestsPerMinute: 60, burst: 2 };
        const now = Date.now();
        (0, vitest_1.expect)((0, rate_limit_1.consumeRateLimitToken)('ACME:quote', config, now).allowed).toBe(true);
        (0, vitest_1.expect)((0, rate_limit_1.consumeRateLimitToken)('ACME:quote', config, now).allowed).toBe(true);
        const blocked = (0, rate_limit_1.consumeRateLimitToken)('ACME:quote', config, now);
        (0, vitest_1.expect)(blocked.allowed).toBe(false);
        (0, vitest_1.expect)(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('refaz refill após passagem de tempo', () => {
        const config = { requestsPerMinute: 60, burst: 1 };
        const now = Date.now();
        (0, vitest_1.expect)((0, rate_limit_1.consumeRateLimitToken)('ROCKET:shipment', config, now).allowed).toBe(true);
        (0, vitest_1.expect)((0, rate_limit_1.consumeRateLimitToken)('ROCKET:shipment', config, now).allowed).toBe(false);
        (0, vitest_1.expect)((0, rate_limit_1.consumeRateLimitToken)('ROCKET:shipment', config, now + 1_100).allowed).toBe(true);
    });
});
//# sourceMappingURL=rate-limit.test.js.map