import { CreateShipmentInput, ICarrierProvider, IRoutingStrategy } from '@freightflow/core';
import { AcmeCarrier } from './acme';
import { CircuitBreakerProviderDecorator } from './circuit-breaker-decorator';
import { RetryProviderDecorator } from './retry-decorator';
import { RocketShipCarrier } from './rocket';

export class ZipPrefixRoutingStrategy implements IRoutingStrategy {
  select(input: CreateShipmentInput, availableProviders: Map<string, ICarrierProvider>): ICarrierProvider {
    const destinationZip = input.destinationZip;
    const targetProviderId = destinationZip.startsWith('0') || destinationZip.startsWith('1') ? 'ACME' : 'ROCKET';

    const provider = availableProviders.get(targetProviderId);
    if (!provider) {
      throw new Error(`Routing strategy could not resolve provider ${targetProviderId}`);
    }

    return provider;
  }
}

export class ProviderSelector {
  private providers: Map<string, ICarrierProvider> = new Map();
  private routingStrategy: IRoutingStrategy;

  constructor(strategy: IRoutingStrategy) {
    this.routingStrategy = strategy;
  }

  register(provider: ICarrierProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ICarrierProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }
    return provider;
  }

  route(input: CreateShipmentInput): ICarrierProvider {
    return this.routingStrategy.select(input, this.providers);
  }

  getAllProviders(): ICarrierProvider[] {
    return Array.from(this.providers.values());
  }
}

// Configured instance using dependency injection (manual)
const strategy = new ZipPrefixRoutingStrategy();
export const defaultSelector = new ProviderSelector(strategy);
defaultSelector.register(new RetryProviderDecorator(new CircuitBreakerProviderDecorator(new AcmeCarrier())));
defaultSelector.register(new RetryProviderDecorator(new CircuitBreakerProviderDecorator(new RocketShipCarrier())));
