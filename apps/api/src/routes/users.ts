import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UserRepository } from "../repositories/userRepository.js";

export async function userRoutes(
  app: FastifyInstance,
  deps: { users: UserRepository }
): Promise<void> {
  app.get("/users", async () => {
    const list = await deps.users.list();
    return { items: list };
  });

  app.post("/users/sync", async (request, reply) => {
    const body = z
      .object({
        uid: z.string().min(1),
        email: z.string().email(),
        displayName: z.string().min(1)
      })
      .parse(request.body ?? {});

    await deps.users.upsert({ ...body, createdAt: Date.now() });
    reply.code(201).send({ ok: true });
  });
}
