# API Specification (MVP)

All endpoints except `GET /health` require header:

- `x-service-token: <SERVICE_TOKEN>`

## Health

### `GET /health`
- Response: `{ ok: true, timestamp: number }`

## Jobs

### `POST /jobs`
Create a new job.

Request:
```json
{
  "type": "sleep.ms",
  "payload": { "durationMs": 1000 },
  "priority": 10,
  "maxAttempts": 3,
  "idempotencyKey": "unique-client-key"
}
```

### `GET /jobs?limit=50&status=PENDING`
List jobs.

### `GET /jobs/:id`
Get one job plus event timeline.

### `POST /jobs/:id/cancel`
Cancel a job.

Request:
```json
{
  "reason": "Cancelled by user"
}
```

### `POST /jobs/:id/retry`
Retry a failed job manually.

Request:
```json
{
  "reason": "Retry requested by user"
}
```

## Workers

### `GET /workers?limit=50`
List workers sorted by latest heartbeat.

### `POST /workers/register`
Register worker process.

Request:
```json
{
  "workerId": "worker-1",
  "concurrency": 1,
  "version": "1.0.0"
}
```

### `POST /workers/:id/heartbeat`
Update worker liveness and running jobs.

Request:
```json
{
  "runningJobs": 0
}
```

### `POST /workers/:id/request-job`
Poll for assignment. Returns `204` when empty queue.

### `POST /jobs/:id/start`
Worker marks job running.

Request:
```json
{
  "workerId": "worker-1"
}
```

### `POST /jobs/:id/complete`
Worker marks success.

### `POST /jobs/:id/fail`
Worker reports failure.

Request:
```json
{
  "workerId": "worker-1",
  "reason": "handler error"
}
```
