import { getAuth } from "firebase-admin/auth";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UserRepository } from "../repositories/userRepository.js";

export async function userRoutes(
  app: FastifyInstance,
  deps: { users: UserRepository }
): Promise<void> {
  /**
   * List all users. Tries Firebase Auth Admin (works when a real service account
   * is present). Falls back to the Firestore `users` collection (populated on
   * each login via POST /users/sync) when Auth Admin is unavailable — e.g. when
   * only the Firestore emulator is running without the Auth emulator.
   */
  app.get("/users", async (request, reply) => {
    try {
      const result = await getAuth().listUsers(1000);
      const items = result.users
        .filter((u) => u.email)
        .map((u) => ({
          uid: u.uid,
          email: u.email ?? "",
          displayName: u.displayName || u.email?.split("@")[0] || u.uid,
          createdAt: new Date(u.metadata.creationTime).getTime()
        }));
      return reply.send({ items });
    } catch (authErr) {
      // Auth Admin unavailable (e.g. emulator without auth service) — fall back
      app.log.warn({ authErr }, "getAuth().listUsers() failed, falling back to Firestore users");
      const items = await deps.users.list();
      return reply.send({ items });
    }
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
