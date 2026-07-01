import type { JobStatus } from "./domain.js";

const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  PENDING: ["LEASED", "CANCELLED"],
  LEASED: ["RUNNING", "PENDING", "FAILED", "CANCELLED"],
  RUNNING: ["SUCCESS", "FAILED", "PENDING", "CANCELLED"],
  SUCCESS: [],
  FAILED: ["PENDING"],
  CANCELLED: []
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid job status transition: ${from} -> ${to}`);
  }
}
