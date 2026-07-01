import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listNotifications, markNotificationRead, type AppNotification } from "../api";
import { useAuth } from "../context/AuthContext";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    try {
      const items = await listNotifications(user.uid);
      setNotifications(items);
    } catch {}
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const handleRead = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
  };

  const markAllRead = async () => {
    const unreadItems = notifications.filter((n) => !n.read);
    await Promise.all(unreadItems.map((n) => markNotificationRead(n.id)));
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full ml-2 bottom-0 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-800">
            {notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => void handleRead(n)}
                className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-800 ${!n.read ? "bg-brand-900/20" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
                  <div className={!n.read ? "" : "pl-3.5"}>
                    <p className={`text-sm ${n.read ? "text-gray-400" : "text-gray-100"}`}>{n.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
