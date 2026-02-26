"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RocketShipCarrier = void 0;
const core_1 = require("@freightflow/core");
const crypto_1 = require("crypto");
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
    async quote(input) {
        const rawResponses = [
            {
                expressService: true,
                totalFreight: input.weight * 3.0 + 20,
                deliveryEstimate: 24, // 1 day in hours
            }
        ];
        return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
    }
    async createShipment(input) {
        // 30% chance of failing to demonstrate retry needs
        if (Math.random() < 0.3) {
            throw new core_1.ProviderError('RocketShip API Error: 503 Service Unavailable');
        }
        return {
            shipmentId: `rs_${(0, crypto_1.randomUUID)()}`,
            providerId: this.id,
        };
    }
    async createLabel(shipmentId) {
        return {
            shipmentId,
            trackingCode: `RS${(0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
            labelUrl: `https://api.rocketship.com/v1/labels/${shipmentId}`,
            format: 'ZPL',
        };
    }
    async track(trackingCode) {
        return {
            trackingCode,
            status: 'PENDING',
            lastPolledAt: new Date(),
            events: [
                { date: new Date(), description: 'Label created' }
            ]
        };
    }
}
exports.RocketShipCarrier = RocketShipCarrier;
//# sourceMappingURL=rocket.js.map