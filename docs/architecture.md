# Architecture Overview

## Gateway Role
FreightFlow Gateway serves as the single integration point for our backend applications to request carrier pricing (quotes), dispatch shipments, generate labels, and process background events (webhooks/shipment status updates).

## Component Breakdown

### API Server (`apps/api`)
- Fastify server running the main REST HTTP endpoints.
- Incorporates Cross-Cutting Concerns seamlessly:
  - **Idempotency** handles safe retries for POST requests.
  - **Observability** injects correlation ID and structured Pino logging.
- Does not contain business logic for specific carriers; solely acts as router.

### Background Worker (`apps/worker`)
- Standard Node container polling `WebhookEvent` and firing HTTP POSTs to subscribed clients. 
- Designed as an Outbox pattern for simulation/webhook processing. 
- Utilizes shared exponential backoff logic with jitter for retries.
- Applies in-memory circuit breaker per webhook subscription to avoid retry storms against unhealthy endpoints.

### Core Domain (`packages/core`)
- Contains universally agreed-upon standard types such as `QuoteNormalized`.
- Defines the `ICarrierProvider` port.

### Providers (`packages/providers`)
- Contains the specific implementations mapping carrier structures to our `packages/core` interfaces.
- Uses `ProviderSelector` to choose routing dynamically.
- Applies resilience decorators (`CircuitBreakerProviderDecorator` + `RetryProviderDecorator`) per provider operation.

### Reliability (`packages/reliability`)
- Provides idempotency primitives for API mutation endpoints.
- Exposes reusable resilience primitives:
  - `RollingWindowCircuitBreaker`
  - `calculateExponentialBackoff` / `sleep`

### Observability (`packages/observability`)
- Structured logging with correlation ID propagation.
- Lightweight resilience metrics helpers (`incrementCounter`, `observeHistogram`) for breaker/retry telemetry.

### Inter-Service Communication
Currently implemented strictly within the Node application memory scope via libraries. 
In the future, `apps/api` and `apps/worker` might communicate via queues (e.g. RabbitMQ/Kafka) for large-scale async requests.
