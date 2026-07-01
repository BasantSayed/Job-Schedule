# Deployment

This project deploys without Docker using GitHub + managed services.

## Target Platforms

- Web: Vercel (`apps/web`)
- API: Render web service (`apps/api`)
- Worker: Render background worker (`apps/worker`)

## GitHub Configuration

Add repository secrets:

- `VERCEL_DEPLOY_HOOK_WEB`
- `RENDER_DEPLOY_HOOK_API`
- `RENDER_DEPLOY_HOOK_WORKER`

CI workflows trigger deploy hooks on pushes to `main` after typecheck, tests, and build pass.

## Environment Variables

### API
- `SERVICE_TOKEN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `PORT`

### Worker
- `SERVICE_TOKEN`
- `API_BASE_URL`
- `WORKER_ID` (optional)
- `WORKER_CONCURRENCY`
- `WORKER_POLL_MS`
- `WORKER_HEARTBEAT_MS`

### Web
- `VITE_API_BASE_URL`
- `VITE_SERVICE_TOKEN`

## Firestore Notes

- Create composite indexes when prompted by Firestore for query patterns.
- Restrict service account credentials to minimum required permissions.
