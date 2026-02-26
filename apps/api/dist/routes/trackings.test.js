"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trackings_1 = require("./trackings");
(0, vitest_1.describe)('normalizeTrackingEvents', () => {
    (0, vitest_1.it)('ordena eventos por data e remove duplicados por chave composta', () => {
        const firstDate = new Date('2026-02-26T10:00:00.000Z');
        const secondDate = new Date('2026-02-26T12:00:00.000Z');
        const normalized = (0, trackings_1.normalizeTrackingEvents)([
            { date: secondDate, description: 'IN_TRANSIT', location: 'SP' },
            { date: firstDate, description: 'POSTED', location: 'SP' },
            { date: secondDate, description: 'IN_TRANSIT', location: 'SP' },
        ]);
        (0, vitest_1.expect)(normalized).toHaveLength(2);
        (0, vitest_1.expect)(normalized[0].description).toBe('POSTED');
        (0, vitest_1.expect)(normalized[1].description).toBe('IN_TRANSIT');
    });
    (0, vitest_1.it)('prioriza dedupe por eventId quando disponível', () => {
        const date = new Date('2026-02-26T10:00:00.000Z');
        const normalized = (0, trackings_1.normalizeTrackingEvents)([
            { date, description: 'IN_TRANSIT', location: 'RJ', eventId: 'evt-1' },
            { date, description: 'IN_TRANSIT_DUP', location: 'RJ', eventId: 'evt-1' },
            { date, description: 'DELIVERED', location: 'RJ', eventId: 'evt-2' },
        ]);
        (0, vitest_1.expect)(normalized).toHaveLength(2);
        (0, vitest_1.expect)(normalized.map((event) => event.description)).toEqual(['IN_TRANSIT', 'DELIVERED']);
    });
});
//# sourceMappingURL=trackings.test.js.map