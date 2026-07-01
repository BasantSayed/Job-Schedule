import { format } from "date-fns";
import { Loader2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
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

export function TaskModal({ initial, defaultDueAt, onSave, onDelete, onClose }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "TODO");
  const [assignedWorkerEmail, setAssignedWorkerEmail] = useState(initial?.assignedWorkerEmail ?? "");
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
        assignedWorkerId: assignedWorkerEmail.trim() || null,
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
            <label className="label">Assign worker (email)</label>
            <input
              className="input"
              placeholder="worker@example.com"
              value={assignedWorkerEmail}
              onChange={(e) => setAssignedWorkerEmail(e.target.value)}
            />
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
