import type { JobRecord } from "@scheduler/shared";

type JobHandler = (job: JobRecord) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  "sleep.ms": async (job) => {
    const duration = Number(job.payload.durationMs ?? 1000);
    await new Promise((resolve) => setTimeout(resolve, duration));
  },
  "text.uppercase": async (job) => {
    const input = String(job.payload.input ?? "");
    const output = input.toUpperCase();
    console.log(`Processed uppercase job ${job.id}: ${output}`);
  }
};

export async function executeJob(job: JobRecord): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`);
  }
  await handler(job);
}
