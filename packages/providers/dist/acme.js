"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcmeCarrier = void 0;
const core_1 = require("@freightflow/core");
const crypto_1 = require("crypto");
class AcmeQuoteNormalizer {
    normalize(raw) {
        return {
            providerId: 'ACME',
            serviceName: raw.service,
            price: raw.cost,
            currency: raw.currencyCode,
            estimatedDays: raw.etaDays
        };
    }
}
class AcmeCarrier {
    id = 'ACME';
    quoteNormalizer = new AcmeQuoteNormalizer();
    async quote(input) {
        // 1. Simulate fetching raw data in the provider's specific proprietary format
        const rawResponses = [
            {
                service: 'Acme Standard',
                cost: input.weight * 1.5 + 10,
                currencyCode: 'USD',
                etaDays: 5
            }
        ];
        // 2. Normalize the proprietary format into the application's unified domain model
        return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
    }
    async createShipment(input) {
        return {
            shipmentId: `acme_shp_${(0, crypto_1.randomUUID)()}`,
            providerId: this.id,
        };
    }
    async createLabel(shipmentId) {
        // Simulate slow provider
        await new Promise(resolve => setTimeout(resolve, 800));
        // Simulate random failures but less frequent, say 10%
        if (Math.random() < 0.1) {
            throw new core_1.ProviderError('Acme API Timeout');
        }
        return {
            shipmentId,
            trackingCode: `1Z${(0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
            labelUrl: `https://acme.com/labels/${shipmentId}.pdf`,
            format: 'PDF',
        };
    }
    async track(trackingCode) {
        return {
            trackingCode,
            status: 'IN_TRANSIT',
            lastPolledAt: new Date(),
            events: [
                { date: new Date(), description: 'Package departed facility', location: 'New York, NY' }
            ]
        };
    }
}
exports.AcmeCarrier = AcmeCarrier;
//# sourceMappingURL=acme.js.map