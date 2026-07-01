import { createJobSchema, cancelJobSchema, retryJobSchema } from "@scheduler/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { EventRepository } from "../repositories/eventRepository.js";
import type { JobRepository } from "../repositories/jobRepository.js";
import type { SchedulerService } from "../services/schedulerService.js";

export async function jobRoutes(
  app: FastifyInstance,
  deps: {
    jobs: JobRepository;
    events: EventRepository;
    scheduler: SchedulerService;
  }
): Promise<void> {
  app.post("/jobs", async (request, reply) => {
    const input = createJobSchema.parse(request.body ?? {});
    const job = await deps.scheduler.createJob(input);
    reply.code(201).send(job);
  });

  app.get("/jobs", async (request) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      status: z.string().optional()
    });
    const query = querySchema.parse(request.query ?? {});
    const jobs = await deps.jobs.list(query.limit, query.status);
    return { items: jobs };
  });

  app.get("/jobs/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const job = await deps.jobs.getById(params.id);
    if (!job) {
      reply.code(404).send({ error: "Job not found" });
      return;
    }
    const events = await deps.events.listByJobId(job.id, 200);
    reply.send({ ...job, events });
  });

  app.post("/jobs/:id/cancel", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = cancelJobSchema.parse(request.body ?? {});
    await deps.scheduler.cancelJob(params.id, body.reason);
    reply.send({ ok: true });
  });

  app.post("/jobs/:id/retry", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = retryJobSchema.parse(request.body ?? {});
    await deps.scheduler.retryJob(params.id, body.reason);
    reply.send({ ok: true });
  });
}
