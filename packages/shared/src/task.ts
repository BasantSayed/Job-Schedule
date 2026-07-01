import { z } from "zod";

export const taskStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedWorkerId: string | null;
  assignedWorkerEmail: string | null;
  startAt: number | null;
  dueAt: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  assignedWorkerId: z.string().nullable().default(null),
  assignedWorkerEmail: z.string().nullable().default(null),
  startAt: z.number().int().positive().nullable().default(null),
  dueAt: z.number().int().positive().nullable().default(null),
  status: z.enum(taskStatuses).default("TODO")
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  assignedWorkerId: z.string().nullable().optional(),
  assignedWorkerEmail: z.string().nullable().optional(),
  startAt: z.number().int().positive().nullable().optional(),
  dueAt: z.number().int().positive().nullable().optional(),
  status: z.enum(taskStatuses).optional()
});
