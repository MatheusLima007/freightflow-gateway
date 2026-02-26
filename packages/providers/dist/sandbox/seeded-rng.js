"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRng = void 0;
class SeededRng {
    state;
    constructor(seed) {
        this.state = seed >>> 0;
    }
    next() {
        this.state += 0x6d2b79f5;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    nextInt(minInclusive, maxInclusive) {
        const span = maxInclusive - minInclusive + 1;
        return Math.floor(this.next() * span) + minInclusive;
    }
    chance(probability) {
        if (probability <= 0)
            return false;
        if (probability >= 1)
            return true;
        return this.next() < probability;
    }
}
exports.SeededRng = SeededRng;
//# sourceMappingURL=seeded-rng.js.map