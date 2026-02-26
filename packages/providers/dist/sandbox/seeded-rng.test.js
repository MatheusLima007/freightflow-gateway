"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const seeded_rng_1 = require("./seeded-rng");
(0, vitest_1.describe)('SeededRng', () => {
    (0, vitest_1.it)('produz sequência determinística para mesma seed', () => {
        const left = new seeded_rng_1.SeededRng(123);
        const right = new seeded_rng_1.SeededRng(123);
        const leftValues = [left.next(), left.next(), left.next(), left.next()];
        const rightValues = [right.next(), right.next(), right.next(), right.next()];
        (0, vitest_1.expect)(leftValues).toEqual(rightValues);
    });
    (0, vitest_1.it)('gera sequências diferentes para seeds diferentes', () => {
        const left = new seeded_rng_1.SeededRng(123);
        const right = new seeded_rng_1.SeededRng(321);
        (0, vitest_1.expect)([left.next(), left.next()]).not.toEqual([right.next(), right.next()]);
    });
});
//# sourceMappingURL=seeded-rng.test.js.map