import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createTask, deleteTask, listTasks, updateTask } from "../api";
import { TaskModal } from "../components/TaskModal";
import { useAuth } from "../context/AuthContext";
import type { TaskRecord, TaskStatus } from "../types";

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  DONE: "bg-emerald-500"
};

const STATUS_BAR: Record<TaskStatus, string> = {
  TODO: "bg-gray-600/70 text-gray-200",
  IN_PROGRESS: "bg-blue-600/80 text-white",
  IN_REVIEW: "bg-yellow-600/80 text-white",
  DONE: "bg-emerald-600/80 text-white"
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  TODO: "bg-gray-500/20 text-gray-300 border-gray-600",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  IN_REVIEW: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  DONE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
};

function taskSpansDay(task: TaskRecord, day: Date): boolean {
  const d = startOfDay(day);
  if (task.startAt && task.dueAt) {
    const s = startOfDay(task.startAt);
    const e = startOfDay(task.dueAt);
    return !isBefore(d, s) && !isAfter(d, e);
  }
  if (task.dueAt) return isSameDay(task.dueAt, day);
  if (task.startAt) return isSameDay(task.startAt, day);
  return false;
}

function isRangeStart(task: TaskRecord, day: Date) {
  return task.startAt ? isSameDay(task.startAt, day) : task.dueAt ? isSameDay(task.dueAt, day) : false;
}

function isRangeEnd(task: TaskRecord, day: Date) {
  return task.dueAt ? isSameDay(task.dueAt, day) : task.startAt ? isSameDay(task.startAt, day) : false;
}

function isSingleDay(task: TaskRecord) {
  if (!task.startAt || !task.dueAt) return true;
  return isSameDay(task.startAt, task.dueAt);
}

export function Calendar() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalTask, setModalTask] = useState<TaskRecord | null | "new">(null);

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

  const calStart = startOfWeek(startOfMonth(month));
  const calEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const tasksForDay = (day: Date) => tasks.filter((t) => taskSpansDay(t, day));
  const selectedTasks = selectedDay ? tasksForDay(selectedDay) : [];

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

  const defaultStart = selectedDay
    ? new Date(selectedDay.toDateString() + " 09:00").getTime()
    : undefined;
  const defaultEnd = selectedDay
    ? new Date(selectedDay.toDateString() + " 18:00").getTime()
    : undefined;

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Calendar</h1>
            <p className="text-sm text-gray-400">{format(month, "MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="btn-secondary p-2"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setMonth(new Date())}
              className="btn-secondary text-xs px-3 py-2"
            >
              Today
            </button>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="btn-secondary p-2"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-800">
              {weekDays.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayTasks = tasksForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const inMonth = isSameMonth(day, month);

                return (
                  <div
                    key={i}
                    onClick={() =>
                      setSelectedDay(
                        isSameDay(day, selectedDay ?? new Date(0)) ? null : day
                      )
                    }
                    className={[
                      "min-h-[100px] p-2 border-b border-r border-gray-800 cursor-pointer transition-colors relative",
                      !inMonth && "opacity-30",
                      isToday(day) && "bg-brand-900/20",
                      isSelected && "bg-brand-900/40 ring-1 ring-inset ring-brand-600",
                      "hover:bg-gray-800/60"
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                        isToday(day) ? "bg-brand-600 text-white" : "text-gray-400"
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>

                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => {
                        const single = isSingleDay(t);
                        const start = isRangeStart(t, day);
                        const end = isRangeEnd(t, day);
                        const mid = !start && !end;

                        if (single) {
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-1 overflow-hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalTask(t);
                              }}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[t.status]}`}
                              />
                              <span className="text-[11px] text-gray-300 truncate">
                                {t.title}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={t.id}
                            className={[
                              "text-[11px] truncate px-1.5 py-0.5 cursor-pointer",
                              STATUS_BAR[t.status],
                              start && !end ? "rounded-l-full mr-0" : "",
                              end && !start ? "rounded-r-full ml-0" : "",
                              single || (start && end) ? "rounded-full" : "",
                              mid ? "rounded-none mx-0" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{
                              marginLeft: start ? "2px" : "0",
                              marginRight: end ? "2px" : "0"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalTask(t);
                            }}
                          >
                            {start ? t.title : ""}
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span className="text-[10px] text-gray-500">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="w-72 shrink-0">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {format(selectedDay, "MMMM d, yyyy")}
              </h2>
              <button
                onClick={() => setModalTask("new")}
                className="btn-primary px-2.5 py-1.5 text-xs"
              >
                <Plus size={13} />
                Task
              </button>
            </div>
            {selectedTasks.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-sm text-gray-500">No tasks this day</p>
                <button
                  onClick={() => setModalTask("new")}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-2"
                >
                  + Create one
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setModalTask(t)}
                    className="card cursor-pointer hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${STATUS_COLORS[t.status]}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`badge border text-[10px] ${STATUS_BADGE[t.status]}`}>
                            {t.status.replace(/_/g, " ")}
                          </span>
                          {t.startAt && (
                            <span className="text-[11px] text-gray-500">
                              {format(t.startAt, "MMM d")}
                              {t.dueAt && !isSameDay(t.startAt, t.dueAt) && (
                                <> → {format(t.dueAt, "MMM d")}</>
                              )}
                            </span>
                          )}
                          {!t.startAt && t.dueAt && (
                            <span className="text-[11px] text-gray-500">
                              {format(t.dueAt, "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                        {t.assignedWorkerEmail && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            @{t.assignedWorkerEmail.split("@")[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modalTask !== null && (
        <TaskModal
          initial={modalTask !== "new" ? modalTask : null}
          defaultStartAt={defaultStart}
          defaultDueAt={defaultEnd}
          onSave={onSave}
          onDelete={modalTask !== "new" ? () => onDelete() : undefined}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  );
}
