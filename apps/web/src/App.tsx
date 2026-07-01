import { useEffect, useMemo, useState } from "react";
import { cancelJob, createJob, getJob, listJobs, listWorkers, retryJob } from "./api";
import type { Job, JobDetail, JobStatus, Worker } from "./types";

const statuses: Array<JobStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "LEASED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED"
];

export function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "sleep.ms",
    payload: "{\"durationMs\": 1000}",
    priority: 10,
    maxAttempts: 3
  });

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      running: jobs.filter((job) => job.status === "RUNNING").length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
      success: jobs.filter((job) => job.status === "SUCCESS").length
    };
  }, [jobs]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextJobs, nextWorkers] = await Promise.all([listJobs(statusFilter), listWorkers()]);
      setJobs(nextJobs);
      setWorkers(nextWorkers);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [statusFilter]);

  const onCreateJob = async () => {
    try {
      const payload = JSON.parse(form.payload) as Record<string, unknown>;
      await createJob({
        type: form.type,
        payload,
        priority: form.priority,
        maxAttempts: form.maxAttempts,
        idempotencyKey: crypto.randomUUID()
      });
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create job");
    }
  };

  const onSelectJob = async (id: string) => {
    try {
      const detail = await getJob(id);
      setSelectedJob(detail);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load job");
    }
  };

  return (
    <main className="container">
      <h1>Distributed Job Scheduler</h1>

      <section className="panel grid">
        <div>
          <h2>Overview</h2>
          <p>Total jobs: {stats.total}</p>
          <p>Running: {stats.running}</p>
          <p>Succeeded: {stats.success}</p>
          <p>Failed: {stats.failed}</p>
        </div>
        <div>
          <h2>Workers</h2>
          <p>Online workers: {workers.length}</p>
          {workers.slice(0, 5).map((worker) => (
            <p key={worker.id}>
              {worker.id} - {worker.runningJobs}/{worker.concurrency}
            </p>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Create Job</h2>
        <div className="form">
          <input
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Job type"
          />
          <input
            type="number"
            value={form.priority}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
            }
          />
          <input
            type="number"
            value={form.maxAttempts}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxAttempts: Number(event.target.value) }))
            }
          />
          <textarea
            value={form.payload}
            onChange={(event) => setForm((prev) => ({ ...prev, payload: event.target.value }))}
          />
          <button onClick={() => void onCreateJob()}>Submit Job</button>
        </div>
      </section>

      <section className="panel">
        <h2>Jobs</h2>
        <div className="row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as JobStatus | "ALL")}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Attempts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id.slice(0, 8)}</td>
                <td>{job.type}</td>
                <td>{job.status}</td>
                <td>{job.priority}</td>
                <td>
                  {job.attempt}/{job.maxAttempts}
                </td>
                <td className="row">
                  <button onClick={() => void onSelectJob(job.id)}>Details</button>
                  <button onClick={() => void cancelJob(job.id).then(refresh)}>Cancel</button>
                  <button onClick={() => void retryJob(job.id).then(refresh)}>Retry</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedJob ? (
        <section className="panel">
          <h2>Job Detail: {selectedJob.id}</h2>
          <p>Status: {selectedJob.status}</p>
          <p>Error: {selectedJob.error ?? "-"}</p>
          <h3>Events</h3>
          <ul>
            {selectedJob.events.map((event) => (
              <li key={event.id}>
                [{new Date(event.timestamp).toLocaleTimeString()}] {event.eventType} -{" "}
                {event.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
