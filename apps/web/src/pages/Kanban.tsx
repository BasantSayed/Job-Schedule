import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isSameDay } from "date-fns";
import { CalendarDays, Clock, Loader2, Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import { createTask, deleteTask, listTasks, updateTask } from "../api";
import { TaskModal } from "../components/TaskModal";
import { useAuth } from "../context/AuthContext";
import type { TaskRecord, TaskStatus } from "../types";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "border-gray-600" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-500" },
  { id: "IN_REVIEW", label: "In Review", color: "border-yellow-500" },
  { id: "DONE", label: "Done", color: "border-emerald-500" }
];

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  DONE: "bg-emerald-500"
};

function TaskCard({
  task,
  onClick,
  isDragging
}: {
  task: TaskRecord;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 };

  const isOverdue = !!task.dueAt && task.dueAt < Date.now() && task.status !== "DONE";
  const displayDate = task.dueAt ?? task.startAt;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all group shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-100 leading-tight">{task.title}</p>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${STATUS_DOT[task.status]}`} />
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mb-2.5 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {displayDate && (
          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
            <Clock size={11} />
            {task.startAt && task.dueAt && !isSameDay(task.startAt, task.dueAt)
              ? `${format(task.startAt, "MMM d")} → ${format(task.dueAt, "MMM d")}`
              : format(displayDate, "MMM d, HH:mm")}
          </span>
        )}
        {task.assignedWorkerEmail && (
          <span className="flex items-center gap-1 truncate">
            <User size={11} />
            {task.assignedWorkerEmail.split("@")[0]}
          </span>
        )}
      </div>
    </div>
  );
}

export function Kanban() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<TaskRecord | null | "new">(null);
  const [newColStatus, setNewColStatus] = useState<TaskStatus>("TODO");
  const [filterWorker, setFilterWorker] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = async () => {
    setLoading(true);
    try {
      const all = await listTasks({});
      setTasks(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const byColumn = (status: TaskStatus) =>
    tasks.filter(t => t.status === status && (!filterWorker || (t.assignedWorkerEmail ?? "").includes(filterWorker)));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const task = tasks.find(t => t.id === active.id);
    const newStatus = over.id as TaskStatus;
    if (!task || !COLUMNS.find(c => c.id === newStatus) || task.status === newStatus) return;

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateTask(task.id, { status: newStatus });
    } catch {
      await load();
    }
  };

  const activeTask = tasks.find(t => t.id === activeId);

  const onSave = async (data: Omit<TaskRecord, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    if (modalTask && modalTask !== "new") {
      await updateTask(modalTask.id, data);
    } else {
      await createTask(data, user?.uid ?? "unknown");
    }
    await load();
  };

  const onDelete = async () => {
    if (!modalTask || modalTask === "new") return;
    await deleteTask(modalTask.id);
    await load();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks Board</h1>
          <p className="text-sm text-gray-400">Drag cards between columns to update status</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input h-8 flex-1 sm:w-44 text-xs"
            placeholder="Filter by worker..."
            value={filterWorker}
            onChange={e => setFilterWorker(e.target.value)}
          />
          <button
            onClick={() => { setNewColStatus("TODO"); setModalTask("new"); }}
            className="btn-primary shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(e) => void handleDragEnd(e)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byColumn(col.id);
              return (
                <div key={col.id} className="flex flex-col min-h-[60vh]">
                  <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-100">{col.label}</h3>
                      <span className="badge bg-gray-800 text-gray-400">{colTasks.length}</span>
                    </div>
                    <button
                      onClick={() => { setNewColStatus(col.id); setModalTask("new"); }}
                      className="text-gray-500 hover:text-gray-200 transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <SortableContext items={[col.id, ...colTasks.map(t => t.id)]} strategy={verticalListSortingStrategy}>
                    <div
                      id={col.id}
                      className="flex-1 space-y-2.5 min-h-[100px] rounded-xl p-1"
                    >
                      {colTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setModalTask(task)}
                          isDragging={task.id === activeId}
                        />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                          <CalendarDays size={20} className="mb-1" />
                          <p className="text-xs">Drop here</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCard task={activeTask} onClick={() => {}} isDragging={false} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {modalTask !== null && (
        <TaskModal
          initial={modalTask !== "new" ? modalTask : null}
          onSave={async (data) => { await onSave({ ...data, status: modalTask === "new" ? newColStatus : data.status }); }}
          onDelete={modalTask !== "new" ? () => onDelete() : undefined}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  );
}
