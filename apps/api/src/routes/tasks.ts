import { createTaskSchema, updateTaskSchema, type TaskRecord } from "@scheduler/shared";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NotificationRepository } from "../repositories/notificationRepository.js";
import type { TaskRepository } from "../repositories/taskRepository.js";

export async function taskRoutes(
  app: FastifyInstance,
  deps: { tasks: TaskRepository; notifications: NotificationRepository }
): Promise<void> {
  app.post("/tasks", async (request, reply) => {
    const body = createTaskSchema.parse(request.body ?? {});
    const createdBy = (request.headers["x-user-id"] as string) ?? "unknown";
    const now = Date.now();
    const record: TaskRecord = {
      id: randomUUID(),
      title: body.title,
      description: body.description,
      status: body.status,
      assignedWorkerId: body.assignedWorkerId,
      assignedWorkerEmail: body.assignedWorkerEmail,
      startAt: body.startAt,
      dueAt: body.dueAt,
      createdBy,
      createdAt: now,
      updatedAt: now
    };
    await deps.tasks.create(record);

    if (record.assignedWorkerId && record.assignedWorkerId !== createdBy) {
      await deps.notifications.create({
        id: randomUUID(),
        recipientUid: record.assignedWorkerId,
        type: "TASK_ASSIGNED",
        taskId: record.id,
        taskTitle: record.title,
        message: `You have been assigned to task: "${record.title}"`,
        read: false,
        createdAt: now
      });
    }

    reply.code(201).send(record);
  });

  app.get("/tasks", async (request) => {
    const query = z
      .object({
        status: z.string().optional(),
        assignedWorkerId: z.string().optional(),
        from: z.coerce.number().optional(),
        to: z.coerce.number().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200)
      })
      .parse(request.query ?? {});

    const tasks = await deps.tasks.list({
      status: query.status as TaskRecord["status"] | undefined,
      assignedWorkerId: query.assignedWorkerId,
      from: query.from,
      to: query.to,
      limit: query.limit
    });
    return { items: tasks };
  });

  app.get("/tasks/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const task = await deps.tasks.getById(id);
    if (!task) return reply.code(404).send({ error: "Task not found" });
    return task;
  });

  app.patch("/tasks/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const existing = await deps.tasks.getById(id);
    if (!existing) return reply.code(404).send({ error: "Task not found" });
    const patch = updateTaskSchema.parse(request.body ?? {});
    await deps.tasks.update(id, patch);

    const changerUid = (request.headers["x-user-id"] as string) ?? "unknown";
    if (patch.status && patch.status !== existing.status) {
      const recipients = new Set<string>();
      if (existing.assignedWorkerId) recipients.add(existing.assignedWorkerId);
      if (existing.createdBy) recipients.add(existing.createdBy);
      recipients.delete(changerUid);

      for (const uid of recipients) {
        await deps.notifications.create({
          id: randomUUID(),
          recipientUid: uid,
          type: "STATUS_CHANGED",
          taskId: id,
          taskTitle: existing.title,
          message: `Task "${existing.title}" moved to ${patch.status.replace("_", " ")}`,
          read: false,
          createdAt: Date.now()
        });
      }
    }

    reply.send({ ok: true });
  });

  app.delete("/tasks/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    await deps.tasks.delete(id);
    reply.send({ ok: true });
  });
}
