import { format } from "date-fns";
import { Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listUsers, type AppUser } from "../api";
import { useAuth } from "../context/AuthContext";
import type { TaskRecord, TaskStatus } from "../types";

type Props = {
  initial?: TaskRecord | null;
  defaultStartAt?: number;
  defaultDueAt?: number;
  onSave: (data: Omit<TaskRecord, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function fmtDatetime(ts: number | null | undefined, fallback: number) {
  return format(ts ?? fallback, "yyyy-MM-dd'T'HH:mm");
}

function WorkerAutocomplete({
  value,
  onChange,
  onSelectUser
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectUser: (u: AppUser) => void;
}) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  const filtered = query.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(query.toLowerCase().replace(/^@/, "")) ||
          u.displayName.toLowerCase().includes(query.toLowerCase())
      )
    : users;

  const visibleList = filtered.slice(0, 8);

  const handleInput = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(true);
  };

  const pick = (u: AppUser) => {
    onSelectUser(u);
    onChange(u.email);
    setQuery(u.email);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        placeholder="Click to pick a worker or type to search..."
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
          {visibleList.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500 text-center">
              No users found — make sure they have logged in at least once
            </li>
          )}
          {visibleList.map((u) => (
            <li
              key={u.uid}
              onMouseDown={() => pick(u)}
              className="px-3 py-2.5 hover:bg-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-800 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                {u.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-100 font-medium truncate">{u.displayName}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaskModal({ initial, defaultStartAt, defaultDueAt, onSave, onDelete, onClose }: Props) {
  const { user } = useAuth();
  const now = Date.now();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "TODO");
  const [assignedWorkerEmail, setAssignedWorkerEmail] = useState(initial?.assignedWorkerEmail ?? "");
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(initial?.assignedWorkerId ?? null);
  const [startAt, setStartAt] = useState(fmtDatetime(initial?.startAt, defaultStartAt ?? now));
  const [dueAt, setDueAt] = useState(
    fmtDatetime(initial?.dueAt, defaultDueAt ?? now + 24 * 60 * 60 * 1000)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedUser, setMatchedUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    const startTs = startAt ? new Date(startAt).getTime() : null;
    const dueTs = dueAt ? new Date(dueAt).getTime() : null;
    if (startTs && dueTs && startTs > dueTs) {
      setError("Start date cannot be after end date");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        status,
        assignedWorkerId: (assignedWorkerId ?? assignedWorkerEmail.trim()) || null,
        assignedWorkerEmail: assignedWorkerEmail.trim() || null,
        startAt: startTs,
        dueAt: dueTs
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">
            {initial ? "Edit Task" : "Create Task"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none h-20"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start date &amp; time</label>
              <input
                type="datetime-local"
                className="input"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <label className="label">End date &amp; time</label>
              <input
                type="datetime-local"
                className="input"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Assign worker</label>
            <WorkerAutocomplete
              value={assignedWorkerEmail}
              onChange={(v) => {
                setAssignedWorkerEmail(v);
                if (!matchedUser || v !== matchedUser.email) {
                  setAssignedWorkerId(null);
                  setMatchedUser(null);
                }
              }}
              onSelectUser={(u) => {
                setAssignedWorkerId(u.uid);
                setAssignedWorkerEmail(u.email);
                setMatchedUser(u);
              }}
            />
            {assignedWorkerEmail && (
              <p className={`text-xs mt-1 ${matchedUser ? "text-emerald-400" : "text-gray-500"}`}>
                {matchedUser
                  ? `✓ ${matchedUser.displayName} — will receive a notification`
                  : "No matching user found yet"}
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Created by: {user?.email ?? "you"}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div>
            {onDelete && (
              <button onClick={() => void handleDelete()} className="btn-danger" disabled={deleting}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => void handleSave()} className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
