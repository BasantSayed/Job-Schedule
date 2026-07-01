import type { Job, JobDetail, TaskRecord, Worker } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN as string;

async function apiRequest<T>(path: string, init?: RequestInit, userId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-service-token": SERVICE_TOKEN,
      ...(userId ? { "x-user-id": userId } : {}),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function listJobs(statusFilter: string): Promise<Job[]> {
  const query = new URLSearchParams({ limit: "100" });
  if (statusFilter !== "ALL") query.set("status", statusFilter);
  const data = await apiRequest<{ items: Job[] }>(`/jobs?${query.toString()}`);
  return data.items;
}

export async function getJob(id: string): Promise<JobDetail> {
  return apiRequest<JobDetail>(`/jobs/${id}`);
}

export async function createJob(input: {
  type: string;
  priority: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<void> {
  await apiRequest("/jobs", { method: "POST", body: JSON.stringify(input) });
}

export async function listWorkers(): Promise<Worker[]> {
  const data = await apiRequest<{ items: Worker[] }>("/workers?limit=100");
  return data.items;
}

export async function cancelJob(id: string): Promise<void> {
  await apiRequest(`/jobs/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: "Cancelled from dashboard" })
  });
}

export async function retryJob(id: string): Promise<void> {
  await apiRequest(`/jobs/${id}/retry`, {
    method: "POST",
    body: JSON.stringify({ reason: "Retried from dashboard" })
  });
}

export async function listTasks(filters: {
  status?: string;
  assignedWorkerId?: string;
  from?: number;
  to?: number;
}): Promise<TaskRecord[]> {
  const query = new URLSearchParams({ limit: "500" });
  if (filters.status) query.set("status", filters.status);
  if (filters.assignedWorkerId) query.set("assignedWorkerId", filters.assignedWorkerId);
  if (filters.from) query.set("from", String(filters.from));
  if (filters.to) query.set("to", String(filters.to));
  const data = await apiRequest<{ items: TaskRecord[] }>(`/tasks?${query.toString()}`);
  return data.items;
}

export async function createTask(
  input: Omit<TaskRecord, "id" | "createdAt" | "updatedAt" | "createdBy">,
  userId: string
): Promise<TaskRecord> {
  return apiRequest<TaskRecord>("/tasks", {
    method: "POST",
    body: JSON.stringify(input)
  }, userId);
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<TaskRecord, "title" | "description" | "status" | "assignedWorkerId" | "assignedWorkerEmail" | "dueAt">>
): Promise<void> {
  await apiRequest(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest(`/tasks/${id}`, { method: "DELETE" });
}
