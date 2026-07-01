# Runbook

## Local Development

1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and fill values.
3. Install dependencies:
   - `npm install`
4. Start API:
   - `npm run dev --workspace @scheduler/api`
5. Start worker in a second terminal:
   - `npm run dev --workspace @scheduler/worker`
6. Start web dashboard in a third terminal:
   - `npm run dev --workspace @scheduler/web`

## Common Incidents

## Worker not processing jobs

- Check `POST /workers/register` succeeded.
- Check heartbeats are hitting API.
- Verify service token matches between API and worker.
- Confirm there are `PENDING` jobs with `runAfter <= now`.

## Jobs stuck in `LEASED` or `RUNNING`

- Verify recovery loop is active in API logs.
- Check `leaseUntil` and heartbeat interval.
- Ensure worker can call `complete`/`fail` endpoints.

## High failure rate

- Inspect `jobEvents` for recurring error message.
- Verify job payload format expected by handler.
- Increase `maxAttempts` only if failures are transient.
