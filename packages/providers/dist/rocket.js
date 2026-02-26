"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RocketShipCarrier = void 0;
const core_1 = require("@freightflow/core");
const crypto_1 = require("crypto");
const sandbox_1 = require("./sandbox");
class RocketQuoteNormalizer {
    normalize(raw) {
        return {
            providerId: 'ROCKET',
            serviceName: raw.expressService ? 'Rocket Express' : 'Rocket Standard',
            price: raw.totalFreight,
            currency: 'USD',
            estimatedDays: Math.ceil(raw.deliveryEstimate / 24)
        };
    }
}
class RocketShipCarrier {
    id = 'ROCKET';
    quoteNormalizer = new RocketQuoteNormalizer();
    sandbox = new sandbox_1.ProviderSandboxEngine(this.id, 29);
    async quote(input) {
        return this.sandbox.run('quote', async () => {
            const rawResponses = [
                {
                    expressService: true,
                    totalFreight: input.weight * 3.0 + 20,
                    deliveryEstimate: 24,
                }
            ];
            return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
        }, {
            mutatePayload: (payload) => payload.map((entry) => ({ ...entry, serviceName: `${entry.serviceName} (sandbox)` })),
        });
    }
    async createShipment(input) {
        return this.sandbox.run('shipment', async () => {
            if (input.weight <= 0) {
                throw new core_1.ProviderError('RocketShip invalid weight', 'ROCKET_BAD_REQUEST');
            }
            return {
                shipmentId: `rs_${(0, crypto_1.randomUUID)()}`,
                providerId: this.id,
            };
        });
    }
    async createLabel(shipmentId) {
        return this.sandbox.run('label', async () => ({
            shipmentId,
            trackingCode: `RS${(0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
            labelUrl: `https://api.rocketship.com/v1/labels/${shipmentId}`,
            format: 'ZPL',
        }));
    }
    async track(trackingCode) {
        return this.sandbox.run('tracking', async () => {
            const now = new Date();
            return {
                trackingCode,
                status: 'PENDING',
                lastPolledAt: now,
                events: [
                    { date: new Date(now.getTime() - 2 * 60 * 60 * 1000), description: 'Label created' },
                    { date: new Date(now.getTime() - 60 * 60 * 1000), description: 'Picked up by carrier', location: 'Seattle, WA' },
                ]
            };
        }, {
            mutatePayload: (payload) => {
                const clone = {
                    ...payload,
                    events: [...payload.events],
                };
                if (clone.events.length > 1) {
                    clone.events = [clone.events[1], clone.events[0], clone.events[1]];
                }
                return clone;
            },
        });
    }
}
exports.RocketShipCarrier = RocketShipCarrier;
//# sourceMappingURL=rocket.js.map