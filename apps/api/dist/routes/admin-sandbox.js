"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSandboxRoutes = adminSandboxRoutes;
const providers_1 = require("@freightflow/providers");
const profileSchema = {
    params: {
        type: 'object',
        required: ['provider'],
        properties: {
            provider: { type: 'string' },
        }
    },
    body: {
        type: 'object',
        required: ['profile'],
        properties: {
            profile: { type: 'string' },
        }
    }
};
function assertAdminToken(token) {
    const expected = process.env.SANDBOX_ADMIN_TOKEN;
    if (!expected) {
        return { ok: false, reason: 'SANDBOX_ADMIN_TOKEN not configured' };
    }
    if (!token || token !== expected) {
        return { ok: false, reason: 'Invalid admin token' };
    }
    return { ok: true };
}
async function adminSandboxRoutes(app) {
    app.post('/v1/admin/sandbox/providers/:provider/profile', { schema: profileSchema }, async (request, reply) => {
        const auth = assertAdminToken(request.headers['x-admin-token']);
        if (!auth.ok) {
            return reply.status(401).send({ message: auth.reason });
        }
        const providerId = request.params.provider.toUpperCase();
        const available = providers_1.defaultSelector.getAllProviders().some((provider) => provider.id === providerId);
        if (!available) {
            return reply.status(404).send({ message: `Provider ${providerId} not found` });
        }
        const { profile } = request.body;
        if (!(0, providers_1.isSandboxProfileKnown)(profile)) {
            return reply.status(400).send({ message: `Unknown sandbox profile ${profile}` });
        }
        const updated = (0, providers_1.setProviderSandboxProfile)(providerId, profile);
        return reply.status(200).send({ message: 'Sandbox profile updated', ...updated });
    });
    app.get('/v1/admin/sandbox/status', async (request, reply) => {
        const auth = assertAdminToken(request.headers['x-admin-token']);
        if (!auth.ok) {
            return reply.status(401).send({ message: auth.reason });
        }
        return reply.status(200).send((0, providers_1.getSandboxStatusSnapshot)());
    });
}
//# sourceMappingURL=admin-sandbox.js.map