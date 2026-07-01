export type AppConfig = {
  port: number;
  host: string;
  serviceToken: string;
  projectId: string;
  leaseMs: number;
  heartbeatGraceMs: number;
  corsOrigins: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getConfig(): AppConfig {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: Number(process.env.PORT ?? "8080"),
    host: process.env.HOST ?? "0.0.0.0",
    serviceToken: requireEnv("SERVICE_TOKEN"),
    projectId: requireEnv("FIREBASE_PROJECT_ID"),
    leaseMs: Number(process.env.JOB_LEASE_MS ?? "60000"),
    heartbeatGraceMs: Number(process.env.HEARTBEAT_GRACE_MS ?? "30000"),
    corsOrigins
  };
}
