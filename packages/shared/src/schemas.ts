import { z } from "zod";
import { jobStatuses, workerStatuses } from "./domain.js";

export const createJobSchema = z.object({
  type: z.string().min(1).max(120),
  payload: z.record(z.unknown()).default({}),
  priority: z.number().int().min(0).max(100).default(10),
  maxAttempts: z.number().int().min(1).max(20).default(3),
  idempotencyKey: z.string().min(8).max(128)
});

export const cancelJobSchema = z.object({
  reason: z.string().min(1).max(200).default("Cancelled by user")
});

export const retryJobSchema = z.object({
  reason: z.string().min(1).max(200).default("Retry requested by user")
});

export const registerWorkerSchema = z.object({
  workerId: z.string().min(3).max(128),
  concurrency: z.number().int().min(1).max(100).default(1),
  version: z.string().min(1).max(32).default("1.0.0")
});

export const heartbeatSchema = z.object({
  runningJobs: z.number().int().min(0).max(10000).default(0)
});

export const workerStatusSchema = z.enum(workerStatuses);
export const jobStatusSchema = z.enum(jobStatuses);
