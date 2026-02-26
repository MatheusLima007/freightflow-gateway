import { ErrorRates, FaultKind, SandboxOperation } from './types';

export class SandboxFaultError extends Error {
  code?: string;
  statusCode?: number;
  retryAfterSeconds?: number;
  transient: boolean;

  constructor(message: string, transient: boolean, options?: { code?: string; statusCode?: number; retryAfterSeconds?: number }) {
    super(message);
    this.transient = transient;
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

const DEFAULT_ERROR_RATES: ErrorRates = {
  timeout: 0,
  http5xx: 0,
  http429: 0,
  http4xx: 0,
  connReset: 0,
  payloadDivergence: 0,
};

export function mergeErrorRates(override?: Partial<ErrorRates>): ErrorRates {
  return {
    ...DEFAULT_ERROR_RATES,
    ...override,
  };
}

export function pickFaultKind(random: number, rates: ErrorRates): FaultKind {
  const plan: Array<[FaultKind, number]> = [
    ['timeout', rates.timeout],
    ['connReset', rates.connReset],
    ['http500', rates.http5xx / 3],
    ['http502', rates.http5xx / 3],
    ['http503', rates.http5xx / 3],
    ['http429', rates.http429],
    ['http400', rates.http4xx],
    ['payloadDivergence', rates.payloadDivergence],
  ];

  let cursor = 0;
  for (const [kind, rate] of plan) {
    cursor += Math.max(0, rate);
    if (random < cursor) {
      return kind;
    }
  }

  return 'none';
}

export function isTransientFault(faultKind: FaultKind): boolean {
  return ['timeout', 'connReset', 'http500', 'http502', 'http503', 'http429'].includes(faultKind);
}

export function makeFaultError(operation: SandboxOperation, providerId: string, fault: FaultKind, retryAfterSeconds = 1): SandboxFaultError {
  if (fault === 'timeout') {
    return new SandboxFaultError(`${providerId}.${operation} timed out`, true, { code: 'ETIMEDOUT', statusCode: 504 });
  }

  if (fault === 'connReset') {
    return new SandboxFaultError(`${providerId}.${operation} connection reset`, true, { code: 'ECONNRESET', statusCode: 503 });
  }

  if (fault === 'http429') {
    return new SandboxFaultError(`${providerId}.${operation} rate limited`, true, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds,
    });
  }

  if (fault === 'http500') {
    return new SandboxFaultError(`${providerId}.${operation} failed with 500`, true, { statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  if (fault === 'http502') {
    return new SandboxFaultError(`${providerId}.${operation} failed with 502`, true, { statusCode: 502, code: 'BAD_GATEWAY' });
  }

  if (fault === 'http503') {
    return new SandboxFaultError(`${providerId}.${operation} failed with 503`, true, { statusCode: 503, code: 'SERVICE_UNAVAILABLE' });
  }

  return new SandboxFaultError(`${providerId}.${operation} request is invalid`, false, { statusCode: 400, code: 'BAD_REQUEST' });
}
