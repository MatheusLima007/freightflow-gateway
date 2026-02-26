import { describe, expect, it } from 'vitest';
import { hashPayload } from './idempotency';

describe('hashPayload', () => {
  it('should hash identical payloads to the same string', () => {
    const p1 = { a: 1, b: "hello" };
    const p2 = { a: 1, b: "hello" };
    
    expect(hashPayload(p1)).toBe(hashPayload(p2));
  });

  it('should generate different hashes for different payloads', () => {
    const p1 = { a: 1 };
    const p2 = { a: 2 };
    
    expect(hashPayload(p1)).not.toBe(hashPayload(p2));
  });

  it('should handle strings directly', () => {
    expect(hashPayload('hello')).toBe(hashPayload('hello'));
  });
});
