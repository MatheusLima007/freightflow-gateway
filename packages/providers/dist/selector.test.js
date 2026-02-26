"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const selector_1 = require("./selector");
(0, vitest_1.describe)('ProviderSelector', () => {
    const dummyInput = (zip) => ({
        originZip: '00000',
        destinationZip: zip,
        weight: 1,
        dimensions: { length: 1, width: 1, height: 1 },
        serviceType: 'standard'
    });
    (0, vitest_1.it)('should have initial providers registered in defaultSelector', () => {
        (0, vitest_1.expect)(selector_1.defaultSelector.getAllProviders().length).toBe(2);
        (0, vitest_1.expect)(selector_1.defaultSelector.getProvider('ACME').id).toBe('ACME');
    });
    (0, vitest_1.it)('should throw error for unknown provider', () => {
        const selector = new selector_1.ProviderSelector(new selector_1.ZipPrefixRoutingStrategy());
        (0, vitest_1.expect)(() => selector.getProvider('UNKNOWN')).toThrow(/not found/);
    });
    (0, vitest_1.it)('should route to ACME for destination prefix 0', () => {
        const provider = selector_1.defaultSelector.route(dummyInput('01234'));
        (0, vitest_1.expect)(provider.id).toBe('ACME');
    });
    (0, vitest_1.it)('should route to ROCKET for destination prefix 2', () => {
        const provider = selector_1.defaultSelector.route(dummyInput('21234'));
        (0, vitest_1.expect)(provider.id).toBe('ROCKET');
    });
});
//# sourceMappingURL=selector.test.js.map