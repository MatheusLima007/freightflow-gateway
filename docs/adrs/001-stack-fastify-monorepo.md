# ADR 001: Monorepo and Fastify Stack

## Status
Accepted

## Context
We are building a robust and resilient integration gateway for multiple carriers. The system requires clear boundaries between the core domain, specific provider integrations, observability tools, the main API, and background workers. We need a stack that provides strong typing and fast execution. 

## Decision
1. **pnpm workspaces**: Used to separate code into packages (`core`, `providers`, `reliability`, `observability`) and apps (`api`, `worker`). This enforces clean architecture and isolates dependencies.
2. **Fastify**: Chosen over NestJS and Express for its lightweight nature, excellent plugin system (which greatly simplified writing our `idempotencyPlugin` and `observabilityPlugin`), and superior out-of-the-box performance metrics.
3. **TypeScript**: Provides compile-time safety and self-documenting interfaces (`ICarrierProvider`, `QuoteNormalized`).

## Consequences
- Requires developers to understand Fastify hooks (`onRequest`, `onSend`) compared to traditional Express middleware.
- Speeds up local development cycle and API throughput safely due to Fastify architecture.
