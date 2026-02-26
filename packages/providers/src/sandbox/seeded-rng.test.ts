import { describe, expect, it } from 'vitest';
import { SeededRng } from './seeded-rng';

describe('SeededRng', () => {
  it('produz sequência determinística para mesma seed', () => {
    const left = new SeededRng(123);
    const right = new SeededRng(123);

    const leftValues = [left.next(), left.next(), left.next(), left.next()];
    const rightValues = [right.next(), right.next(), right.next(), right.next()];

    expect(leftValues).toEqual(rightValues);
  });

  it('gera sequências diferentes para seeds diferentes', () => {
    const left = new SeededRng(123);
    const right = new SeededRng(321);

    expect([left.next(), left.next()]).not.toEqual([right.next(), right.next()]);
  });
});
