import { heartbeatSchema, registerWorkerSchema } from "@scheduler/shared";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { JobRepository } from "../repositories/jobRepository.js";
import type { WorkerRepository } from "../repositories/workerRepository.js";
import type { SchedulerService } from "../services/schedulerService.js";

export async function workerRoutes(
  app: FastifyInstance,
  deps: {
    workers: WorkerRepository;
    jobs: JobRepository;
    scheduler: SchedulerService;
  }
): Promise<void> {
  app.get("/workers", async (request) => {
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
      .parse(request.query ?? {});
    const workers = await deps.workers.list(query.limit);
    return { items: workers };
  });

  app.post("/workers/register", async (request, reply) => {
    const body = registerWorkerSchema.parse(request.body ?? {});
    const now = Date.now();
    await deps.workers.upsert({
      id: body.workerId,
      status: "ONLINE",
      lastHeartbeatAt: now,
      concurrency: body.concurrency,
      runningJobs: 0,
      version: body.version,
      createdAt: now,
      updatedAt: now
    });
    reply.code(201).send({ ok: true, workerId: body.workerId });
  });

  app.post("/workers/:id/heartbeat", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = heartbeatSchema.parse(request.body ?? {});
    const current = await deps.workers.getById(params.id);
    if (!current) {
      reply.code(404).send({ error: "Worker not found" });
      return;
    }
    await deps.workers.upsert({
      ...current,
      status: "ONLINE",
      lastHeartbeatAt: Date.now(),
      runningJobs: body.runningJobs,
      updatedAt: Date.now()
    });
    reply.send({ ok: true });
  });

  app.post("/workers/:id/request-job", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const worker = await deps.workers.getById(params.id);
    if (!worker) {
      reply.code(404).send({ error: "Worker not found" });
      return;
    }

    const job = await deps.scheduler.requestJob(params.id);
    if (!job) {
      reply.code(204).send();
      return;
    }
    reply.send(job);
  });

  app.post("/jobs/:id/start", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ workerId: z.string().min(1) }).parse(request.body ?? {});
    await deps.scheduler.markRunning(params.id, body.workerId);
    await deps.jobs.bumpRunningJobs(body.workerId, 1);
    reply.send({ ok: true });
  });

  app.post("/jobs/:id/complete", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ workerId: z.string().min(1) }).parse(request.body ?? {});
    await deps.scheduler.completeJob(params.id, body.workerId);
    await deps.jobs.bumpRunningJobs(body.workerId, -1);
    reply.send({ ok: true });
  });

  app.post("/jobs/:id/fail", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z
      .object({ workerId: z.string().min(1), reason: z.string().min(1).max(300) })
      .parse(request.body ?? {});
    await deps.scheduler.failJob(params.id, body.workerId, body.reason);
    await deps.jobs.bumpRunningJobs(body.workerId, -1);
    reply.send({ ok: true });
  });
}
