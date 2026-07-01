export type WorkerConfig = {
  apiBaseUrl: string;
  serviceToken: string;
  workerId: string;
  concurrency: number;
  version: string;
  pollMs: number;
  heartbeatMs: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getConfig(): WorkerConfig {
  return {
    apiBaseUrl: requireEnv("API_BASE_URL"),
    serviceToken: requireEnv("SERVICE_TOKEN"),
    workerId: process.env.WORKER_ID ?? `worker-${Math.random().toString(36).slice(2, 8)}`,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "1"),
    version: process.env.WORKER_VERSION ?? "1.0.0",
    pollMs: Number(process.env.WORKER_POLL_MS ?? "3000"),
    heartbeatMs: Number(process.env.WORKER_HEARTBEAT_MS ?? "10000")
  };
}
