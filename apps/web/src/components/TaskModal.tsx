import { format } from "date-fns";
import { Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listUsers, type AppUser } from "../api";
import { useAuth } from "../context/AuthContext";
import type { TaskRecord, TaskStatus } from "../types";

type Props = {
  initial?: TaskRecord | null;
  defaultDueAt?: number;
  onSave: (data: Omit<TaskRecord, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

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
  const [suggestions, setSuggestions] = useState<AppUser[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    if (v.length >= 1) {
      const q = v.toLowerCase().replace(/^@/, "");
      setSuggestions(users.filter((u) => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)).slice(0, 6));
    } else {
      setSuggestions([]);
    }
  };

  const pick = (u: AppUser) => {
    onSelectUser(u);
    onChange(u.email);
    setSuggestions([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSuggestions([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        placeholder="Type @ or email to search workers..."
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((u) => (
            <li
              key={u.uid}
              onMouseDown={() => pick(u)}
              className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex flex-col"
            >
              <span className="text-sm text-gray-100 font-medium">{u.displayName}</span>
              <span className="text-xs text-gray-400">{u.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaskModal({ initial, defaultDueAt, onSave, onDelete, onClose }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "TODO");
  const [assignedWorkerEmail, setAssignedWorkerEmail] = useState(initial?.assignedWorkerEmail ?? "");
  const [assignedWorkerId, setAssignedWorkerId] = useState(initial?.assignedWorkerId ?? null);
  const [dueAt, setDueAt] = useState(
    format(initial?.dueAt ?? defaultDueAt ?? Date.now(), "yyyy-MM-dd'T'HH:mm")
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        status,
        assignedWorkerId: (assignedWorkerId ?? assignedWorkerEmail.trim()) || null,
        assignedWorkerEmail: assignedWorkerEmail.trim() || null,
        dueAt: new Date(dueAt).getTime()
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
      <div className="modal">
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
              className="input resize-none h-24"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date &amp; time</label>
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
                setAssignedWorkerId(null);
              }}
              onSelectUser={(u) => {
                setAssignedWorkerId(u.uid);
                setAssignedWorkerEmail(u.email);
              }}
            />
            {assignedWorkerEmail && (
              <p className="text-xs text-gray-500 mt-1">
                {assignedWorkerId ? "✓ Matched to a registered user — they'll get a notification" : "No matching user found yet"}
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
