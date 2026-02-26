# FreightFlow Gateway

Gateway de integrações com transportadoras usando padrões **Adapter/Strategy**, com **normalização de dados** (quote/tracking/label), **webhooks simulados**, **retry + idempotência**, **circuit breaker**, **backoff exponencial**, **observabilidade** e **correlationId**.

> Propósito: demonstrar domínio de arquitetura de integrações e resiliência (alinhado ao contexto do app GEM).

---

## Visão Geral

O FreightFlow Gateway é um serviço que unifica a comunicação com múltiplas transportadoras através de uma camada de abstração:

- **Adapters por transportadora** (ex.: Correios, Jadlog, DHL, FedEx — no MVP podem ser mocks)
- **Strategy/Selector** para escolher o provider com base em regras (tipo de envio, SLA, região, etc.)
- **Normalização** para contratos internos consistentes:
  - `Quote` (cotação)
  - `Label` (geração de etiqueta)
  - `Tracking` (rastreamento)
- **Webhooks** de atualização de status (simulados no MVP)
- **Confiabilidade**: retry com política, **idempotência** e rastreio por **correlationId**
- **Resiliência operacional**: circuit breaker por operação e por assinatura de webhook

---

## MVP (Entrega mínima)

### Funcionalidades
1. **Gateway de transportadoras com Adapter/Strategy**
2. **Normalização de dados**: quote, tracking, label
3. **Webhooks de status de entrega (simulados)**
4. **Retry + idempotência** (sem duplicar operações)

### Não-Objetivos no MVP (mas preparados)
- UI/Painel web
- Providers reais (pode ficar em mocks/sandbox)

---

## Depois (Evoluções)

- **Sandbox providers (mocks sofisticados)**
- **Painel web** para visualizar eventos, filas, falhas e reprocessamentos
- **Observabilidade** (logs estruturados, métricas, traces)
- **Rastreamento ponta-a-ponta** com `correlationId` + `idempotencyKey`

---

## Arquitetura (Proposta)

### Camadas
- **API** (REST) — recebe requisições do cliente (GEM ou qualquer app)
- **Core** (Domínio) — contratos normalizados + regras de seleção
- **Providers** (Adapters) — integração específica por transportadora
- **Reliability** — retry, idempotência, outbox (opcional), circuit breaker (fase 2)
- **Events/Webhooks** — publicação e entrega de eventos
- **Observability** — correlationId, logs estruturados, tracing

### Fluxo (exemplo tracking)
1. Cliente chama `GET /v1/trackings/{trackingCode}`
2. Core seleciona provider pelo código/regra
3. Adapter consulta provider (ou mock)
4. Resposta é convertida para `TrackingNormalized`
5. API retorna contrato padronizado com `correlationId`

---

## Contratos Normalizados (Exemplos)

### QuoteNormalized
- `requestId`
- `correlationId`
- `items[]`
- `from/to`
- `services[]` (prazo, preço, moeda, restrições)
- `providerMeta` (dados crus opcionais)

### LabelNormalized
- `shipmentId`
- `labelUrl | labelBase64`
- `documents[]`
- `providerRef`

### TrackingNormalized
- `trackingCode`
- `status`
- `events[]` (data, local, descrição, status)
- `estimatedDelivery`
- `providerRef`

---

## Confiabilidade (MVP)

### Idempotência
- Toda operação mutável (ex.: gerar etiqueta/criar envio) aceita `Idempotency-Key`
- O serviço persiste:
  - chave
  - fingerprint do payload (hash)
  - resposta gerada
  - status (PROCESSING/SUCCEEDED/FAILED)
- Requisições repetidas com a mesma chave retornam a resposta original

### Retry
- Retry para falhas transitórias:
  - timeouts
  - 5xx
  - erros de rede
- Política simples no MVP (ex.: 3 tentativas)
- Backoff exponencial com jitter para reduzir rajadas e sincronização de retries

### Circuit Breaker
- Decorator de circuit breaker em chamadas de provider (escopo por operação)
- Circuit breaker no worker por assinatura de webhook para proteger endpoints degradados
- Estados `CLOSED`, `OPEN`, `HALF_OPEN` com janela deslizante para taxa de falhas

---

## Webhooks (Simulados no MVP)

- Endpoint para “registrar webhook”:
  - `POST /v1/webhooks/subscriptions`
- Worker/scheduler simula eventos:
  - `shipment.posted`
  - `shipment.in_transit`
  - `shipment.delivered`
  - `shipment.exception`
- Entrega de webhook:
  - assinatura (HMAC) opcional
  - retries e DLQ (fase 2)

---

## Endpoints (Sugestão)

### Health
- `GET /health`

### Quotes
- `POST /v1/quotes`

### Labels / Shipments
- `POST /v1/shipments` (mutável → idempotência)
- `POST /v1/shipments/{id}/label` (mutável → idempotência)

### Tracking
- `GET /v1/trackings/{trackingCode}`

### Webhooks
- `POST /v1/webhooks/subscriptions`
- `GET /v1/webhooks/events` (painel/inspeção, opcional)
- `POST /v1/simulations/dispatch` (forçar disparo de eventos simulados)

### Admin (opcional)
- `GET /v1/admin/failures`
- `POST /v1/admin/retry/{eventId}`

---

## Estrutura de Pastas (sugestão)

.
├── apps/
│   ├── api/                  # HTTP API
│   └── worker/               # simulador de webhooks / jobs
├── packages/
│   ├── core/                 # contratos normalizados + regras
│   ├── providers/            # adapters das transportadoras
│   ├── reliability/          # idempotência, retry, circuit breaker (fase 2)
│   ├── observability/        # correlationId, logger, tracing
│   └── shared/               # utils e tipos comuns
├── infra/
│   ├── docker/               # docker-compose, etc.
│   └── db/                   # migrations/seed
└── docs/
    ├── architecture.md
    ├── api.md
    └── decisions/            # ADRs (Architecture Decision Records)

---

## Stack (sugestão)

Escolha uma stack e mantenha consistente. Exemplos:

- **Node.js + TypeScript**
- API: Fastify/NestJS
- DB: Postgres (idempotência/outbox)
- Queue (fase 2): Redis/BullMQ ou RabbitMQ
- Observabilidade: OpenTelemetry (fase 2)

> A stack pode ser ajustada conforme seu padrão no GEM.

---

## Qualidade e Boas Práticas

- Logs estruturados com `correlationId`
- Validação de payload (Zod/Joi)
- Testes unitários (core + adapters) e integração (API)
- Contratos documentados (OpenAPI)
- ADRs para decisões importantes

---

## Como rodar (placeholder)

> Preencha com os comandos do projeto depois do scaffolding.

- `docker compose up -d`
- `pnpm install`
- `pnpm dev`

---

## Roadmap resumido

- [x] MVP: gateway + normalização + webhooks simulados + retry + idempotência
- [x] Circuit breaker + backoff exponencial
- [x] Providers sandbox avançados
- [ ] Painel web de eventos/falhas
- [ ] Observabilidade completa (OTel)

---

## Licença
MIT