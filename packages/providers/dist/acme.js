"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcmeCarrier = void 0;
const core_1 = require("@freightflow/core");
const crypto_1 = require("crypto");
const sandbox_1 = require("./sandbox");
class AcmeQuoteNormalizer {
    normalize(raw) {
        return {
            providerId: 'ACME',
            serviceName: raw.service,
            price: raw.cost,
            currency: raw.currencyCode ?? 'USD',
            estimatedDays: raw.etaDays
        };
    }
}
class AcmeCarrier {
    id = 'ACME';
    quoteNormalizer = new AcmeQuoteNormalizer();
    sandbox = new sandbox_1.ProviderSandboxEngine(this.id, 11);
    async quote(input) {
        return this.sandbox.run('quote', async () => {
            const rawResponses = [
                {
                    service: 'Acme Standard',
                    cost: input.weight * 1.5 + 10,
                    currencyCode: 'USD',
                    etaDays: 5
                }
            ];
            return rawResponses.map(raw => this.quoteNormalizer.normalize(raw));
        });
    }
    async createShipment(input) {
        return this.sandbox.run('shipment', async () => ({
            shipmentId: `acme_shp_${(0, crypto_1.randomUUID)()}`,
            providerId: this.id,
        }));
    }
    async createLabel(shipmentId) {
        return this.sandbox.run('label', async () => {
            if (shipmentId.startsWith('invalid')) {
                throw new core_1.ProviderError('Acme invalid shipment id', 'ACME_BAD_REQUEST');
            }
            return {
                shipmentId,
                trackingCode: `1Z${(0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
                labelUrl: `https://acme.com/labels/${shipmentId}.pdf`,
                format: 'PDF',
            };
        });
    }
    async track(trackingCode) {
        return this.sandbox.run('tracking', async () => {
            const now = new Date();
            return {
                trackingCode,
                status: 'IN_TRANSIT',
                lastPolledAt: now,
                events: [
                    { date: new Date(now.getTime() - 60 * 60 * 1000), description: 'Package received at facility', location: 'New York, NY' },
                    { date: now, description: 'Package departed facility', location: 'New York, NY' }
                ]
            };
        }, {
            mutatePayload: (payload) => {
                const clone = {
                    ...payload,
                    events: [...payload.events],
                };
                if (clone.events.length > 0) {
                    clone.events.push({ ...clone.events[0] });
                    clone.events = clone.events.reverse();
                }
                return clone;
            }
        });
    }
}
exports.AcmeCarrier = AcmeCarrier;
//# sourceMappingURL=acme.js.map