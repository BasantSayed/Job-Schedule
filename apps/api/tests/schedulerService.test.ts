import { describe, expect, it, vi } from "vitest";
import type { JobRecord } from "@scheduler/shared";
import { SchedulerService } from "../src/services/schedulerService.js";

function createJob(overrides: Partial<JobRecord> = {}): JobRecord {
  const now = Date.now();
  return {
    id: "job-1",
    type: "sleep.ms",
    payload: {},
    priority: 10,
    status: "LEASED",
    attempt: 0,
    maxAttempts: 2,
    runAfter: now,
    leaseOwner: "worker-1",
    leaseUntil: now + 5000,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    error: null,
    cancelRequested: false,
    idempotencyKey: "idem-12345678",
    ...overrides
  };
}

describe("SchedulerService", () => {
  it("rejects execution updates from non-owner worker", async () => {
    const jobs = {
      getById: vi.fn().mockResolvedValue(createJob()),
      updateById: vi.fn(),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      claimNextAvailable: vi.fn(),
      getExpiredLeases: vi.fn(),
      bumpRunningJobs: vi.fn()
    };
    const events = { add: vi.fn(), listByJobId: vi.fn() };

    const service = new SchedulerService(jobs as never, events as never, 60000);

    await expect(service.completeJob("job-1", "worker-2")).rejects.toThrow(
      /not lease owner/i
    );
  });

  it("schedules retry when failing before max attempts", async () => {
    const jobs = {
      getById: vi.fn().mockResolvedValue(createJob({ status: "RUNNING" })),
      updateById: vi.fn(),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      claimNextAvailable: vi.fn(),
      getExpiredLeases: vi.fn(),
      bumpRunningJobs: vi.fn()
    };
    const events = { add: vi.fn(), listByJobId: vi.fn() };

    const service = new SchedulerService(jobs as never, events as never, 60000);
    await service.failJob("job-1", "worker-1", "handler error");

    expect(jobs.updateById).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        status: "PENDING",
        attempt: 1
      })
    );
  });
});
