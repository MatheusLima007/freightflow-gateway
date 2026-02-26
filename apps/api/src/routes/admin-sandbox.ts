import { defaultSelector, getSandboxStatusSnapshot, isSandboxProfileKnown, setProviderSandboxProfile } from '@freightflow/providers';
import { FastifyInstance } from 'fastify';

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

function assertAdminToken(token: string | undefined) {
  const expected = process.env.SANDBOX_ADMIN_TOKEN;
  if (!expected) {
    return { ok: false, reason: 'SANDBOX_ADMIN_TOKEN not configured' };
  }

  if (!token || token !== expected) {
    return { ok: false, reason: 'Invalid admin token' };
  }

  return { ok: true };
}

export async function adminSandboxRoutes(app: FastifyInstance) {
  app.post<{ Params: { provider: string }; Body: { profile: string } }>(
    '/v1/admin/sandbox/providers/:provider/profile',
    { schema: profileSchema },
    async (request, reply) => {
      const auth = assertAdminToken(request.headers['x-admin-token'] as string | undefined);
      if (!auth.ok) {
        return reply.status(401).send({ message: auth.reason });
      }

      const providerId = request.params.provider.toUpperCase();
      const available = defaultSelector.getAllProviders().some((provider) => provider.id === providerId);
      if (!available) {
        return reply.status(404).send({ message: `Provider ${providerId} not found` });
      }

      const { profile } = request.body;
      if (!isSandboxProfileKnown(profile)) {
        return reply.status(400).send({ message: `Unknown sandbox profile ${profile}` });
      }

      const updated = setProviderSandboxProfile(providerId, profile);
      return reply.status(200).send({ message: 'Sandbox profile updated', ...updated });
    }
  );

  app.get('/v1/admin/sandbox/status', async (request, reply) => {
    const auth = assertAdminToken(request.headers['x-admin-token'] as string | undefined);
    if (!auth.ok) {
      return reply.status(401).send({ message: auth.reason });
    }

    return reply.status(200).send(getSandboxStatusSnapshot());
  });
}
