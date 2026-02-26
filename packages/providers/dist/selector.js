"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSelector = exports.ProviderSelector = exports.ZipPrefixRoutingStrategy = void 0;
const acme_1 = require("./acme");
const retry_decorator_1 = require("./retry-decorator");
const rocket_1 = require("./rocket");
class ZipPrefixRoutingStrategy {
    select(input, availableProviders) {
        const destinationZip = input.destinationZip;
        const targetProviderId = destinationZip.startsWith('0') || destinationZip.startsWith('1') ? 'ACME' : 'ROCKET';
        const provider = availableProviders.get(targetProviderId);
        if (!provider) {
            throw new Error(`Routing strategy could not resolve provider ${targetProviderId}`);
        }
        return provider;
    }
}
exports.ZipPrefixRoutingStrategy = ZipPrefixRoutingStrategy;
class ProviderSelector {
    providers = new Map();
    routingStrategy;
    constructor(strategy) {
        this.routingStrategy = strategy;
    }
    register(provider) {
        this.providers.set(provider.id, provider);
    }
    getProvider(id) {
        const provider = this.providers.get(id);
        if (!provider) {
            throw new Error(`Provider ${id} not found`);
        }
        return provider;
    }
    route(input) {
        return this.routingStrategy.select(input, this.providers);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
}
exports.ProviderSelector = ProviderSelector;
// Configured instance using dependency injection (manual)
const strategy = new ZipPrefixRoutingStrategy();
exports.defaultSelector = new ProviderSelector(strategy);
exports.defaultSelector.register(new retry_decorator_1.RetryProviderDecorator(new acme_1.AcmeCarrier()));
exports.defaultSelector.register(new retry_decorator_1.RetryProviderDecorator(new rocket_1.RocketShipCarrier()));
//# sourceMappingURL=selector.js.map