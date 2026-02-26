import { describe, expect, it } from 'vitest';
import { isTransientFault, makeFaultError, mergeErrorRates, pickFaultKind } from './faults';

describe('sandbox faults', () => {
  it('escolhe fault de forma previsível pela distribuição', () => {
    const rates = mergeErrorRates({
      timeout: 0.1,
      connReset: 0.1,
      http5xx: 0.3,
      http429: 0.1,
      http4xx: 0.1,
      payloadDivergence: 0.2,
    });

    expect(pickFaultKind(0.05, rates)).toBe('timeout');
    expect(pickFaultKind(0.15, rates)).toBe('connReset');
    expect(pickFaultKind(0.25, rates)).toBe('http500');
    expect(pickFaultKind(0.35, rates)).toBe('http502');
    expect(pickFaultKind(0.45, rates)).toBe('http503');
    expect(pickFaultKind(0.62, rates)).toBe('http400');
    expect(pickFaultKind(0.72, rates)).toBe('payloadDivergence');
    expect(pickFaultKind(0.85, rates)).toBe('payloadDivergence');
    expect(pickFaultKind(0.99, rates)).toBe('none');
  });

  it('classifica corretamente faults transient/permanent', () => {
    expect(isTransientFault('timeout')).toBe(true);
    expect(isTransientFault('http429')).toBe(true);
    expect(isTransientFault('http500')).toBe(true);
    expect(isTransientFault('http400')).toBe(false);
    expect(isTransientFault('payloadDivergence')).toBe(false);
  });

  it('cria erro 429 com Retry-After', () => {
    const error = makeFaultError('quote', 'ACME', 'http429', 4);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfterSeconds).toBe(4);
    expect(error.transient).toBe(true);
  });
});
