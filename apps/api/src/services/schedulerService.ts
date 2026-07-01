import {
  assertTransition,
  computeBackoffMs,
  shouldRetry,
  type JobEventRecord,
  type JobRecord
} from "@scheduler/shared";
import { randomUUID } from "node:crypto";
import { EventRepository } from "../repositories/eventRepository.js";
import { JobRepository } from "../repositories/jobRepository.js";

export class SchedulerService {
  constructor(
    private readonly jobs: JobRepository,
    private readonly events: EventRepository,
    private readonly leaseMs: number
  ) {}

  async createJob(input: {
    type: string;
    payload: Record<string, unknown>;
    priority: number;
    maxAttempts: number;
    idempotencyKey: string;
  }): Promise<JobRecord> {
    const existing = await this.jobs.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const now = Date.now();
    const record: JobRecord = {
      id: randomUUID(),
      type: input.type,
      payload: input.payload,
      priority: input.priority,
      status: "PENDING",
      attempt: 0,
      maxAttempts: input.maxAttempts,
      runAfter: now,
      leaseOwner: null,
      leaseUntil: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
      error: null,
      cancelRequested: false,
      idempotencyKey: input.idempotencyKey
    };

    await this.jobs.create(record);
    await this.recordEvent(record.id, null, "CREATED", "Job created");
    return record;
  }

  async requestJob(workerId: string): Promise<JobRecord | null> {
    const leaseUntil = Date.now() + this.leaseMs;
    const claimed = await this.jobs.claimNextAvailable(workerId, leaseUntil);
    if (!claimed) return null;
    await this.recordEvent(claimed.id, workerId, "LEASED", "Job leased to worker");
    return claimed;
  }

  async markRunning(jobId: string, workerId: string): Promise<void> {
    const current = await this.ensureJob(jobId);
    this.assertOwnedByWorker(current, workerId);
    if (current.cancelRequested) {
      throw new Error("Job was cancelled and cannot start");
    }
    assertTransition(current.status, "RUNNING");
    await this.jobs.updateById(jobId, {
      status: "RUNNING",
      leaseOwner: workerId,
      leaseUntil: Date.now() + this.leaseMs,
      startedAt: current.startedAt ?? Date.now()
    });
    await this.recordEvent(jobId, workerId, "RUNNING", "Worker started execution");
  }

  async completeJob(jobId: string, workerId: string): Promise<void> {
    const current = await this.ensureJob(jobId);
    this.assertOwnedByWorker(current, workerId);
    assertTransition(current.status, "SUCCESS");
    await this.jobs.updateById(jobId, {
      status: "SUCCESS",
      leaseOwner: null,
      leaseUntil: null,
      finishedAt: Date.now(),
      error: null
    });
    await this.recordEvent(jobId, workerId, "SUCCESS", "Job completed successfully");
  }

  async failJob(jobId: string, workerId: string, reason: string): Promise<void> {
    const current = await this.ensureJob(jobId);
    this.assertOwnedByWorker(current, workerId);

    if (shouldRetry(current.attempt, current.maxAttempts)) {
      const nextAttempt = current.attempt + 1;
      await this.jobs.updateById(jobId, {
        status: "PENDING",
        attempt: nextAttempt,
        runAfter: Date.now() + computeBackoffMs(nextAttempt),
        leaseOwner: null,
        leaseUntil: null,
        error: reason
      });
      await this.recordEvent(
        jobId,
        workerId,
        "RETRY_SCHEDULED",
        `Job failed, retry scheduled. attempt=${nextAttempt}`
      );
      return;
    }

    await this.jobs.updateById(jobId, {
      status: "FAILED",
      leaseOwner: null,
      leaseUntil: null,
      finishedAt: Date.now(),
      error: reason
    });
    await this.recordEvent(jobId, workerId, "FAILED", `Job failed permanently: ${reason}`);
  }

  async cancelJob(jobId: string, reason: string): Promise<void> {
    const current = await this.ensureJob(jobId);
    if (current.status === "SUCCESS" || current.status === "FAILED" || current.status === "CANCELLED") {
      return;
    }
    await this.jobs.updateById(jobId, {
      status: "CANCELLED",
      cancelRequested: true,
      leaseOwner: null,
      leaseUntil: null,
      finishedAt: Date.now()
    });
    await this.recordEvent(jobId, null, "CANCELLED", reason);
  }

  async retryJob(jobId: string, reason: string): Promise<void> {
    const current = await this.ensureJob(jobId);
    if (current.status !== "FAILED") {
      throw new Error("Only FAILED jobs can be retried manually");
    }
    await this.jobs.updateById(jobId, {
      status: "PENDING",
      runAfter: Date.now(),
      error: null,
      leaseOwner: null,
      leaseUntil: null
    });
    await this.recordEvent(jobId, null, "REQUEUED", reason);
  }

  async recoverExpiredLeases(): Promise<number> {
    const expired = await this.jobs.getExpiredLeases(Date.now(), 100);
    let recovered = 0;
    for (const job of expired) {
      if (shouldRetry(job.attempt, job.maxAttempts)) {
        const nextAttempt = job.attempt + 1;
        await this.jobs.updateById(job.id, {
          status: "PENDING",
          attempt: nextAttempt,
          runAfter: Date.now() + computeBackoffMs(nextAttempt),
          leaseOwner: null,
          leaseUntil: null,
          error: "Lease expired; job requeued"
        });
        await this.recordEvent(
          job.id,
          job.leaseOwner,
          "REQUEUED",
          `Lease expired; requeued attempt=${nextAttempt}`
        );
      } else {
        await this.jobs.updateById(job.id, {
          status: "FAILED",
          leaseOwner: null,
          leaseUntil: null,
          finishedAt: Date.now(),
          error: "Lease expired and max attempts reached"
        });
        await this.recordEvent(job.id, job.leaseOwner, "FAILED", "Lease expired at max attempts");
      }
      recovered += 1;
    }
    return recovered;
  }

  private async ensureJob(jobId: string): Promise<JobRecord> {
    const record = await this.jobs.getById(jobId);
    if (!record) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return record;
  }

  private assertOwnedByWorker(job: JobRecord, workerId: string): void {
    if (job.leaseOwner !== workerId) {
      throw new Error(`Worker ${workerId} is not lease owner for job ${job.id}`);
    }
  }

  private async recordEvent(
    jobId: string,
    workerId: string | null,
    eventType: JobEventRecord["eventType"],
    message: string
  ): Promise<void> {
    await this.events.add({
      id: randomUUID(),
      jobId,
      workerId,
      eventType,
      message,
      timestamp: Date.now()
    });
  }
}
