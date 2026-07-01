# Architecture

This project implements a distributed job scheduler with a lightweight control plane and horizontally scalable workers.

## Components

- `apps/web`: React dashboard used by operators to submit and monitor jobs.
- `apps/api`: Fastify API and scheduler logic. Owns job lifecycle transitions.
- `apps/worker`: Node worker process that polls for assignments and reports results.
- `packages/shared`: Shared domain types, validation schemas, transition guards, retry logic.
- Firestore: Shared persistent state for jobs, workers, and job events.

## Data Flow

1. User submits job from web dashboard to API.
2. API validates request and creates a `PENDING` job.
3. Worker heartbeats and asks API for work.
4. API atomically leases one available job (`PENDING -> LEASED`).
5. Worker marks start (`LEASED -> RUNNING`), executes handler, reports completion/failure.
6. API marks terminal state (`SUCCESS`/`FAILED`) or requeues based on retry policy.
7. Recovery loop periodically requeues expired leases.

## Distributed Safety Properties

- **Single-claim assignment**: Firestore transaction prevents duplicate lease claims.
- **Lease ownership enforcement**: only lease owner can mark start/complete/fail.
- **Crash recovery**: expired leases are requeued with backoff.
- **Idempotent create**: duplicate `idempotencyKey` returns existing job.
- **Explicit transitions**: transition guard rejects invalid status moves.
