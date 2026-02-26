# ADR 002: Idempotency with Fastify Hooks and PostgreSQL

## Status
Accepted

## Context
Endpoints like Shipment Creation and Label Generation are mutable and potentially expensive (interacting with slow third-party providers). Clients hitting these endpoints could retry requests on timeout, leading to duplicate shipments.

## Decision
We implemented Idempotency directly via Fastify Hooks intercepting `Idempotency-Key`.
1. **Pre-processing Hook**: Before executing the route handler, Fastify queries the `IdempotencyKey` in PostgreSQL. If the request payload matches the hash, it replays the cached response.
2. **Post-processing Hook (onSend)**: Upon successful transaction, it stores the response body and status code.

## Consequences
- Positive: No changes required inside the route handlers itself. The plugin completely abstracts the caching logic.
- Positive: Protects the downstream `ICarrierProvider` implementations from double-charging.
- Negative: Adds database query overhead on mutating endpoints.
