"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const faults_1 = require("./faults");
(0, vitest_1.describe)('sandbox faults', () => {
    (0, vitest_1.it)('escolhe fault de forma previsível pela distribuição', () => {
        const rates = (0, faults_1.mergeErrorRates)({
            timeout: 0.1,
            connReset: 0.1,
            http5xx: 0.3,
            http429: 0.1,
            http4xx: 0.1,
            payloadDivergence: 0.2,
        });
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.05, rates)).toBe('timeout');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.15, rates)).toBe('connReset');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.25, rates)).toBe('http500');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.35, rates)).toBe('http502');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.45, rates)).toBe('http503');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.62, rates)).toBe('http400');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.72, rates)).toBe('payloadDivergence');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.85, rates)).toBe('payloadDivergence');
        (0, vitest_1.expect)((0, faults_1.pickFaultKind)(0.99, rates)).toBe('none');
    });
    (0, vitest_1.it)('classifica corretamente faults transient/permanent', () => {
        (0, vitest_1.expect)((0, faults_1.isTransientFault)('timeout')).toBe(true);
        (0, vitest_1.expect)((0, faults_1.isTransientFault)('http429')).toBe(true);
        (0, vitest_1.expect)((0, faults_1.isTransientFault)('http500')).toBe(true);
        (0, vitest_1.expect)((0, faults_1.isTransientFault)('http400')).toBe(false);
        (0, vitest_1.expect)((0, faults_1.isTransientFault)('payloadDivergence')).toBe(false);
    });
    (0, vitest_1.it)('cria erro 429 com Retry-After', () => {
        const error = (0, faults_1.makeFaultError)('quote', 'ACME', 'http429', 4);
        (0, vitest_1.expect)(error.statusCode).toBe(429);
        (0, vitest_1.expect)(error.retryAfterSeconds).toBe(4);
        (0, vitest_1.expect)(error.transient).toBe(true);
    });
});
//# sourceMappingURL=faults.test.js.map