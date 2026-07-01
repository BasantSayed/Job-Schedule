import type { JobRecord } from "@scheduler/shared";
import { ApiClient } from "./apiClient.js";
import { getConfig } from "./config.js";
import { executeJob } from "./handlers.js";

async function main(): Promise<void> {
  const config = getConfig();
  const api = new ApiClient(config.apiBaseUrl, config.serviceToken);
  let runningJobs = 0;
  let shuttingDown = false;

  await api.requestJson("/workers/register", {
    method: "POST",
    body: {
      workerId: config.workerId,
      concurrency: config.concurrency,
      version: config.version
    }
  });

  const heartbeatTimer = setInterval(async () => {
    try {
      await api.requestJson(`/workers/${config.workerId}/heartbeat`, {
        method: "POST",
        body: { runningJobs }
      });
    } catch (error) {
      console.error("Heartbeat failed", error);
    }
  }, config.heartbeatMs);

  const pollingLoop = async () => {
    while (!shuttingDown) {
      try {
        if (runningJobs >= config.concurrency) {
          await sleep(config.pollMs);
          continue;
        }

        const job = await api.requestJson<JobRecord>(`/workers/${config.workerId}/request-job`, {
          method: "POST",
          body: {}
        });
        if (!job) {
          await sleep(config.pollMs);
          continue;
        }

        runningJobs += 1;
        void runJob(api, config.workerId, job)
          .catch((error) => {
            console.error(`Job ${job.id} execution failed`, error);
          })
          .finally(() => {
            runningJobs -= 1;
          });
      } catch (error) {
        console.error("Polling loop error", error);
        await sleep(config.pollMs);
      }
    }
  };

  const shutdown = async () => {
    shuttingDown = true;
    clearInterval(heartbeatTimer);
    await api.requestJson(`/workers/${config.workerId}/heartbeat`, {
      method: "POST",
      body: { runningJobs: 0 }
    });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await pollingLoop();
}

async function runJob(api: ApiClient, workerId: string, job: JobRecord): Promise<void> {
  await api.requestJson(`/jobs/${job.id}/start`, {
    method: "POST",
    body: { workerId }
  });

  try {
    await executeJob(job);
    await api.requestJson(`/jobs/${job.id}/complete`, {
      method: "POST",
      body: { workerId }
    });
  } catch (error) {
    await api.requestJson(`/jobs/${job.id}/fail`, {
      method: "POST",
      body: {
        workerId,
        reason: error instanceof Error ? error.message : "Unknown worker failure"
      }
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  // Top-level crash visibility avoids silent worker death.
  console.error("Worker fatal startup error", error);
  process.exit(1);
});
