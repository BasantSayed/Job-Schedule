import type { FastifyReply, FastifyRequest } from "fastify";

export function buildAuthHook(serviceToken: string) {
  return async function authHook(request: FastifyRequest, reply: FastifyReply) {
    if (request.url === "/health") return;
    const provided = request.headers["x-service-token"];
    if (provided !== serviceToken) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  };
}
