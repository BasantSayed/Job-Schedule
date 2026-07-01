import {
  BrainCircuit,
  CalendarDays,
  Kanban,
  LayoutDashboard,
  LogOut
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Kanban", icon: Kanban },
  { to: "/calendar", label: "Calendar", icon: CalendarDays }
];

export function Sidebar() {
  const { user, logout } = useAuth();

  const initials = (user?.displayName ?? user?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-gray-900 border-r border-gray-800 py-5 px-3 shrink-0">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <BrainCircuit className="text-brand-500 shrink-0" size={26} />
        <span className="font-semibold text-white text-sm leading-tight">
          Job Scheduler
        </span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="flex items-center gap-2 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-100 truncate">
              {user?.displayName ?? "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
