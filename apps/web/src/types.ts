export type JobStatus = "PENDING" | "LEASED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type JobEvent = {
  id: string;
  jobId: string;
  workerId: string | null;
  eventType: string;
  message: string;
  timestamp: number;
};

export type Job = {
  id: string;
  type: string;
  priority: number;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  error: string | null;
};

export type JobDetail = Job & {
  payload: Record<string, unknown>;
  events: JobEvent[];
};

export type Worker = {
  id: string;
  status: "ONLINE" | "OFFLINE";
  lastHeartbeatAt: number;
  runningJobs: number;
  concurrency: number;
  version: string;
};
