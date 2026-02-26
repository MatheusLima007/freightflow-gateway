# Sandbox avançado de providers

Este documento descreve como usar os providers sandbox avançados para simular comportamentos reais de integração com transportadoras.

## Objetivo

Permitir testes e demos com cenários realistas, sem alterar a API pública:

- variação de latência
- falhas transitórias e permanentes
- 429 com `Retry-After`
- timeout/reset/5xx
- inconsistência eventual em tracking
- caos de webhooks (reorder, duplicate, drop)

## Perfis disponíveis

Os perfis ficam em `packages/providers/src/sandbox/profiles.ts`.

- `default`: comportamento estável com baixa taxa de erro
- `flaky`: alta intermitência (timeouts/5xx/reset)
- `degraded`: latência alta e degradação consistente
- `rateLimited`: foco em `429` e quotas apertadas
- `peakHours`: pico operacional (latência + throttling moderado)

## Configuração

### Variáveis de ambiente

- `SANDBOX_SEED` (default: `20260226`)
- `SANDBOX_CHAOS_ENABLED` (default: `true`)
- `SANDBOX_RATE_LIMIT_ENABLED` (default: `true`)
- `SANDBOX_CONFIG_PATH` (opcional, caminho para JSON)
- `PROVIDER_SANDBOX_PROFILE_ACME` (ex.: `flaky`)
- `PROVIDER_SANDBOX_PROFILE_ROCKET` (ex.: `rateLimited`)
- `PROVIDER_SANDBOX_PROFILE_WEBHOOK` (ex.: `degraded`)
- `SANDBOX_WEBHOOK_DUPLICATE_MODE` (`sameEventId` | `newEventId` | `mixed`)
- `SANDBOX_ADMIN_TOKEN` (obrigatório para endpoints admin)

### Arquivo JSON (opcional)

Exemplo de `sandbox-config.json`:

```json
{
  "seed": 123,
  "chaosEnabled": true,
  "rateLimitEnabled": true,
  "providerProfiles": {
    "ACME": "flaky",
    "ROCKET": "rateLimited",
    "WEBHOOK": "degraded"
  }
}
```

Precedência: `env` > `runtime admin` > arquivo JSON > defaults.

## Endpoints admin (runtime)

Header obrigatório: `x-admin-token: <SANDBOX_ADMIN_TOKEN>`

- `POST /v1/admin/sandbox/providers/:provider/profile`
  - body: `{ "profile": "flaky" }`
- `GET /v1/admin/sandbox/status`

## Comportamentos implementados

### Providers

- fault injection por operação (`quote`, `shipment`, `label`, `tracking`)
- classificação transient/permanent
- rate limit com token-bucket (`req/min` + `burst`)
- `429` com `Retry-After` respeitado pelo retry decorator
- payload divergence para testar normalização

### Tracking eventual consistency

- tracking pode atrasar estado/reflexo de eventos
- resposta final do gateway passa por normalização:
  - ordenação por data (`occurredAt`/`date`)
  - dedupe por `eventId` quando existir
  - fallback de dedupe por `description + date + location`

### Webhook chaos

- reorder da fila (determinístico por seed)
- duplicate com modo configurável:
  - `sameEventId`: simula redelivery
  - `newEventId`: simula duplicação semântica
  - `mixed`: alterna entre ambos
- drop parcial com registro de tentativa e resultado

## Reproduzir bugs com seed

1. Defina `SANDBOX_SEED` fixa (ex.: `123`).
2. Ative perfil alvo (`PROVIDER_SANDBOX_PROFILE_ACME=flaky`).
3. Rode os mesmos inputs novamente.

Com a mesma seed e perfil, o plano de caos/faults é reproduzível em testes.

## Demo local

```bash
docker compose up -d
pnpm install
SANDBOX_SEED=123 \
SANDBOX_CHAOS_ENABLED=true \
SANDBOX_RATE_LIMIT_ENABLED=true \
SANDBOX_ADMIN_TOKEN=demo-token \
PROVIDER_SANDBOX_PROFILE_ACME=flaky \
PROVIDER_SANDBOX_PROFILE_ROCKET=rateLimited \
PROVIDER_SANDBOX_PROFILE_WEBHOOK=degraded \
pnpm -r build
```

Depois, inicie API/worker conforme fluxo do workspace.
