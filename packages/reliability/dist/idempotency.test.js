"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const idempotency_1 = require("./idempotency");
(0, vitest_1.describe)('hashPayload', () => {
    (0, vitest_1.it)('should hash identical payloads to the same string', () => {
        const p1 = { a: 1, b: "hello" };
        const p2 = { a: 1, b: "hello" };
        (0, vitest_1.expect)((0, idempotency_1.hashPayload)(p1)).toBe((0, idempotency_1.hashPayload)(p2));
    });
    (0, vitest_1.it)('should generate different hashes for different payloads', () => {
        const p1 = { a: 1 };
        const p2 = { a: 2 };
        (0, vitest_1.expect)((0, idempotency_1.hashPayload)(p1)).not.toBe((0, idempotency_1.hashPayload)(p2));
    });
    (0, vitest_1.it)('should handle strings directly', () => {
        (0, vitest_1.expect)((0, idempotency_1.hashPayload)('hello')).toBe((0, idempotency_1.hashPayload)('hello'));
    });
});
//# sourceMappingURL=idempotency.test.js.map