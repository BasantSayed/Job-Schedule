import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Clock,
  Plus,
  RefreshCw,
  Server,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cancelJob, createJob, getJob, listJobs, listWorkers, retryJob } from "../api";
import type { Job, JobDetail, JobStatus, Worker } from "../types";

type SortKey = "createdAt" | "priority" | "status" | "type";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LEASED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RUNNING: "bg-brand-500/15 text-brand-400 border-brand-500/30",
  SUCCESS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  CANCELLED: "bg-gray-500/15 text-gray-400 border-gray-500/30"
};

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: "sleep.ms", payload: '{"durationMs":1000}', priority: 10, maxAttempts: 3 });
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [j, w] = await Promise.all([listJobs(statusFilter), listWorkers()]);
      setJobs(j);
      setWorkers(w);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); const t = setInterval(() => void refresh(), 5000); return () => clearInterval(t); }, [statusFilter]);

  const stats = useMemo(() => ({
    total: jobs.length,
    running: jobs.filter(j => j.status === "RUNNING").length,
    success: jobs.filter(j => j.status === "SUCCESS").length,
    failed: jobs.filter(j => j.status === "FAILED").length,
    pending: jobs.filter(j => j.status === "PENDING").length
  }), [jobs]);

  const sorted = useMemo(() => {
    let list = jobs.filter(j => !typeFilter || j.type.includes(typeFilter));
    list = [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [jobs, typeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleCreate = async () => {
    try {
      const payload = JSON.parse(form.payload) as Record<string, unknown>;
      await createJob({ type: form.type, payload, priority: form.priority, maxAttempts: form.maxAttempts, idempotencyKey: crypto.randomUUID() });
      setShowCreate(false);
      await refresh();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to create job"); }
  };

  const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) => (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label}<ArrowUpDown size={12} /></span>
    </th>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Distributed job scheduler overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void refresh()} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(v => !v)} className="btn-primary">
            <Plus size={15} />
            New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Activity} label="Total Jobs" value={stats.total} color="bg-brand-500/15 text-brand-400" />
        <StatCard icon={Clock} label="Running" value={stats.running} color="bg-blue-500/15 text-blue-400" />
        <StatCard icon={CheckCircle2} label="Succeeded" value={stats.success} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={AlertCircle} label="Pending" value={stats.pending} color="bg-yellow-500/15 text-yellow-400" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} color="bg-red-500/15 text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Server size={16} className="text-brand-400" />
            <h3 className="text-sm font-medium text-white">Workers</h3>
          </div>
          <div className="space-y-2">
            {workers.length === 0 && <p className="text-xs text-gray-500">No workers registered</p>}
            {workers.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-300 truncate max-w-[100px]">{w.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{w.runningJobs}/{w.concurrency}</span>
                  <span className={`badge border ${w.status === "ONLINE" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-500/15 text-gray-400 border-gray-700"}`}>
                    {w.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {showCreate && (
            <div className="card mb-4">
              <h3 className="text-sm font-semibold text-white mb-4">Create Job</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Type</label>
                  <input className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Priority (0-100)</label>
                  <input type="number" className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Max attempts</label>
                  <input type="number" className="input" value={form.maxAttempts} onChange={e => setForm(p => ({ ...p, maxAttempts: Number(e.target.value) }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Payload (JSON)</label>
                  <textarea className="input h-20 resize-none font-mono text-xs" value={form.payload} onChange={e => setForm(p => ({ ...p, payload: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => void handleCreate()} className="btn-primary">Submit</button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <input className="input h-8 w-40 text-xs" placeholder="Filter by type..." value={typeFilter} onChange={e => setTypeFilter(e.target.value)} />
              <select className="input h-8 w-36 text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value as JobStatus | "ALL")}>
                {["ALL", "PENDING", "LEASED", "RUNNING", "SUCCESS", "FAILED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-xs text-gray-500 ml-auto">{sorted.length} jobs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/50">
                  <tr>
                    <SortTh label="Type" k="type" />
                    <SortTh label="Status" k="status" />
                    <SortTh label="Priority" k="priority" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attempts</th>
                    <SortTh label="Created" k="createdAt" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sorted.map(job => (
                    <tr key={job.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-xs text-gray-400">{job.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-100">{job.type}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge border ${STATUS_COLORS[job.status]}`}>{job.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{job.priority}</td>
                      <td className="px-4 py-3 text-gray-300">{job.attempt}/{job.maxAttempts}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => void getJob(job.id).then(setSelectedJob)} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Details</button>
                          <button onClick={() => void cancelJob(job.id).then(refresh)} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-400">Cancel</button>
                          <button onClick={() => void retryJob(job.id).then(refresh)} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-brand-900/50 text-gray-300 hover:text-brand-400">Retry</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No jobs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedJob && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedJob(null)}>
          <div className="modal w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-white">Job Detail</h2>
                <p className="text-xs text-gray-400 font-mono">{selectedJob.id}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-gray-400">Type: </span><span className="text-white">{selectedJob.type}</span></div>
                <div><span className="text-gray-400">Status: </span><span className={`badge border ${STATUS_COLORS[selectedJob.status]}`}>{selectedJob.status}</span></div>
                {selectedJob.error && <div className="col-span-2"><span className="text-gray-400">Error: </span><span className="text-red-400">{selectedJob.error}</span></div>}
              </div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Events</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedJob.events.map(ev => (
                  <div key={ev.id} className="flex gap-3 text-xs">
                    <span className="text-gray-500 whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    <span className="text-brand-400 font-medium">{ev.eventType}</span>
                    <span className="text-gray-400">{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
