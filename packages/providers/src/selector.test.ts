import { CreateShipmentInput } from '@freightflow/core';
import { describe, expect, it } from 'vitest';
import { defaultSelector, ProviderSelector, ZipPrefixRoutingStrategy } from './selector';

describe('ProviderSelector', () => {
  const dummyInput = (zip: string): CreateShipmentInput => ({
    originZip: '00000',
    destinationZip: zip,
    weight: 1,
    dimensions: { length: 1, width: 1, height: 1 },
    serviceType: 'standard'
  });

  it('should have initial providers registered in defaultSelector', () => {
    expect(defaultSelector.getAllProviders().length).toBe(2);
    expect(defaultSelector.getProvider('ACME').id).toBe('ACME');
  });

  it('should throw error for unknown provider', () => {
    const selector = new ProviderSelector(new ZipPrefixRoutingStrategy());
    expect(() => selector.getProvider('UNKNOWN')).toThrow(/not found/);
  });

  it('should route to ACME for destination prefix 0', () => {
    const provider = defaultSelector.route(dummyInput('01234'));
    expect(provider.id).toBe('ACME');
  });

  it('should route to ROCKET for destination prefix 2', () => {
    const provider = defaultSelector.route(dummyInput('21234'));
    expect(provider.id).toBe('ROCKET');
  });
});
