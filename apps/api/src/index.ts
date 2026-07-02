import Fastify from "fastify";
import cors from "@fastify/cors";
import { getConfig } from "./config.js";
import { initFirestore } from "./firebase.js";
import { buildAuthHook } from "./http/auth.js";
import { errorHandler } from "./http/error.js";
import { TaskRepository } from "./repositories/taskRepository.js";
import { UserRepository } from "./repositories/userRepository.js";
import { NotificationRepository } from "./repositories/notificationRepository.js";
import { healthRoutes } from "./routes/health.js";
import { taskRoutes } from "./routes/tasks.js";
import { userRoutes } from "./routes/users.js";
import { notificationRoutes } from "./routes/notifications.js";

async function main(): Promise<void> {
  const config = getConfig();
  const db = initFirestore(config.projectId);

  const tasks = new TaskRepository(db);
  const users = new UserRepository(db);
  const notifications = new NotificationRepository(db);

  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"), false);
    }
  });
  app.setErrorHandler(errorHandler);
  app.addHook("preHandler", buildAuthHook(config.serviceToken));

  await healthRoutes(app);
  await taskRoutes(app, { tasks, notifications, users });
  await userRoutes(app, { users });
  await notificationRoutes(app, { notifications });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: config.host });
}

main().catch((error) => {
  // Top-level safeguard with error log to avoid silent failures.
  console.error("Fatal startup error", error);
  process.exit(1);
});
