# Distributed Job Scheduler

Distributed system project using React, Node.js, and Firebase Firestore.

## What is implemented

- React dashboard for creating and monitoring jobs.
- Fastify API with:
  - job CRUD and state transitions
  - worker registration and heartbeat
  - atomic job leasing
  - retry with backoff
  - lease-expiry recovery loop
- Worker runtime with polling, execution handlers, completion/failure reporting.
- Shared package for domain types, validation, transitions, and retry helpers.
- GitHub Actions for web/api/worker CI and deploy hooks.
- Render + Vercel deployment configuration (no Docker).
- Firebase Firestore emulator setup for fully local zero-cost mode.
- GitHub Pages workflow for free static hosting of the web UI.

## Repository Layout

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/shared`
- `docs`

## Quick Start

1. Install Node.js 20+.
2. Copy `.env.example` into environment variables for each service.
3. Install dependencies:
   - `npm install`
4. Run services:
   - API: `npm run dev --workspace @scheduler/api`
   - Worker: `npm run dev --workspace @scheduler/worker`
   - Web: `npm run dev --workspace @scheduler/web`

## Zero-Cost Public Setup

1. Start Firestore emulator:
   - `npm run emulator:start`
2. Run API/worker locally with:
   - `FIRESTORE_EMULATOR_HOST=127.0.0.1:8081`
3. Expose API publicly using Cloudflare Tunnel:
   - `cloudflared tunnel --url http://localhost:8080`
4. Set GitHub repository secrets:
   - `VITE_API_BASE_URL` = your tunnel URL
   - `VITE_SERVICE_TOKEN` = same token as API
5. Push to `main` to auto-deploy web app via GitHub Pages workflow.

## Demo Checklist

1. Open dashboard and create a `sleep.ms` job.
2. Confirm job status transitions:
   - `PENDING -> LEASED -> RUNNING -> SUCCESS`
3. Submit invalid job type and confirm retry then terminal failure.
4. Stop worker during execution; confirm lease-expiry requeue and reassignment.
5. Restart worker and confirm throughput resumes.

## Docs

- `docs/architecture.md`
- `docs/api-spec.md`
- `docs/runbook.md`
- `docs/deployment.md`
