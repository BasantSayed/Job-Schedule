import type { Job, JobDetail, Worker } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN as string;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-service-token": SERVICE_TOKEN,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function listJobs(statusFilter: string): Promise<Job[]> {
  const query = new URLSearchParams();
  query.set("limit", "50");
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
  await apiRequest("/jobs", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listWorkers(): Promise<Worker[]> {
  const data = await apiRequest<{ items: Worker[] }>("/workers?limit=50");
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
