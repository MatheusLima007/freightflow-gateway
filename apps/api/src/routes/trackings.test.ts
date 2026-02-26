import { describe, expect, it } from 'vitest';
import { normalizeTrackingEvents } from './trackings';

describe('normalizeTrackingEvents', () => {
  it('ordena eventos por data e remove duplicados por chave composta', () => {
    const firstDate = new Date('2026-02-26T10:00:00.000Z');
    const secondDate = new Date('2026-02-26T12:00:00.000Z');

    const normalized = normalizeTrackingEvents([
      { date: secondDate, description: 'IN_TRANSIT', location: 'SP' },
      { date: firstDate, description: 'POSTED', location: 'SP' },
      { date: secondDate, description: 'IN_TRANSIT', location: 'SP' },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].description).toBe('POSTED');
    expect(normalized[1].description).toBe('IN_TRANSIT');
  });

  it('prioriza dedupe por eventId quando disponível', () => {
    const date = new Date('2026-02-26T10:00:00.000Z');

    const normalized = normalizeTrackingEvents([
      { date, description: 'IN_TRANSIT', location: 'RJ', eventId: 'evt-1' },
      { date, description: 'IN_TRANSIT_DUP', location: 'RJ', eventId: 'evt-1' },
      { date, description: 'DELIVERED', location: 'RJ', eventId: 'evt-2' },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized.map((event) => event.description)).toEqual(['IN_TRANSIT', 'DELIVERED']);
  });
});
