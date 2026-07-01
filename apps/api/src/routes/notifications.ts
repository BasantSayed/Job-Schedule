import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { NotificationRepository } from "../repositories/notificationRepository.js";

export async function notificationRoutes(
  app: FastifyInstance,
  deps: { notifications: NotificationRepository }
): Promise<void> {
  app.get("/notifications", async (request) => {
    const query = z.object({ uid: z.string().min(1) }).parse(request.query ?? {});
    const items = await deps.notifications.listForUser(query.uid);
    return { items };
  });

  app.post("/notifications/:id/read", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    await deps.notifications.markRead(id);
    reply.send({ ok: true });
  });
}
