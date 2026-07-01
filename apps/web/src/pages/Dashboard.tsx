import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  ListTodo,
  Plus,
  RefreshCw
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTasks } from "../api";
import { useAuth } from "../context/AuthContext";
import type { TaskRecord } from "../types";

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-500/15 text-gray-400 border-gray-600/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IN_REVIEW: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  DONE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
};

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done"
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskRecord }) {
  const overdue = task.dueAt && isPast(task.dueAt) && task.status !== "DONE";
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-100">{task.title}</p>
        {task.description && (
          <p className="text-xs text-gray-500 truncate max-w-xs">{task.description}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`badge border ${TASK_STATUS_COLORS[task.status]}`}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {task.assignedWorkerEmail ? (
          <span className="text-xs text-gray-300">{task.assignedWorkerEmail}</span>
        ) : (
          <span className="text-xs text-gray-600">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3">
        {task.dueAt ? (
          <span className={`text-xs ${overdue ? "text-red-400 font-medium" : "text-gray-400"}`}>
            {overdue && <AlertTriangle size={11} className="inline mr-1" />}
            {format(task.dueAt, "MMM d, HH:mm")}
          </span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(task.createdAt, { addSuffix: true })}
      </td>
    </tr>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const t = await listTasks({});
      setTasks(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      inReview: tasks.filter((t) => t.status === "IN_REVIEW").length,
      done: tasks.filter((t) => t.status === "DONE").length,
      overdue: tasks.filter((t) => t.dueAt && isPast(t.dueAt) && t.status !== "DONE").length,
      mine: tasks.filter((t) => t.assignedWorkerId === user?.uid || t.createdBy === user?.uid)
        .length
    }),
    [tasks, user]
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, statusFilter, search]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">All tasks overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void refresh()} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link to="/kanban" className="btn-primary">
            <Plus size={15} />
            New Task
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={ListTodo} label="Total" value={stats.total} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={CircleDot} label="To Do" value={stats.todo} color="bg-gray-500/15 text-gray-400" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="bg-blue-500/15 text-blue-400" />
        <StatCard icon={Clock} label="In Review" value={stats.inReview} color="bg-yellow-500/15 text-yellow-400" />
        <StatCard icon={CheckCircle2} label="Done" value={stats.done} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="bg-red-500/15 text-red-400" />
        <StatCard icon={ListTodo} label="My Tasks" value={stats.mine} color="bg-brand-500/15 text-brand-400" />
      </div>

      {/* Quick nav */}
      <div className="flex gap-3">
        <Link
          to="/kanban"
          className="flex-1 card hover:border-brand-500/40 transition-colors cursor-pointer group text-center py-4"
        >
          <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
            Kanban Board
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Drag & drop task management</p>
        </Link>
        <Link
          to="/calendar"
          className="flex-1 card hover:border-brand-500/40 transition-colors cursor-pointer group text-center py-4"
        >
          <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
            Calendar View
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Create tasks by date</p>
        </Link>
      </div>

      {/* Task table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tasks
          </span>
          <input
            className="input h-8 w-44 text-xs"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input h-8 w-36 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} tasks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <ListTodo size={32} className="mx-auto text-gray-700 mb-3" />
                    <p className="text-sm text-gray-500">
                      {tasks.length === 0
                        ? "No tasks yet — create one in Kanban or Calendar"
                        : "No tasks match the current filter"}
                    </p>
                    {tasks.length === 0 && (
                      <Link to="/kanban" className="btn-primary mt-4 inline-flex">
                        <Plus size={14} />
                        Create first task
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
