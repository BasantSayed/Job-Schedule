export const jobStatuses = [
  "PENDING",
  "LEASED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED"
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const workerStatuses = ["ONLINE", "OFFLINE"] as const;
export type WorkerStatus = (typeof workerStatuses)[number];

export type JobRecord = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  runAfter: number;
  leaseOwner: string | null;
  leaseUntil: number | null;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
  cancelRequested: boolean;
  idempotencyKey: string;
};

export type WorkerRecord = {
  id: string;
  status: WorkerStatus;
  lastHeartbeatAt: number;
  concurrency: number;
  runningJobs: number;
  version: string;
  createdAt: number;
  updatedAt: number;
};

export type JobEventRecord = {
  id: string;
  jobId: string;
  workerId: string | null;
  eventType:
    | "CREATED"
    | "LEASED"
    | "RUNNING"
    | "REQUEUED"
    | "RETRY_SCHEDULED"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED";
  message: string;
  timestamp: number;
};
