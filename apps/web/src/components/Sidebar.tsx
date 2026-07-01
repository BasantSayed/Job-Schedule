import {
  BrainCircuit,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/calendar", label: "Calendar", icon: CalendarDays }
];

type Props = { open: boolean; onClose: () => void };

export function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth();

  const initials = (user?.displayName ?? user?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed top-0 left-0 h-full z-40 flex flex-col w-60 bg-gray-900 border-r border-gray-800 py-5 px-3 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0 lg:z-auto lg:shrink-0"
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-3 mb-8">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="text-brand-500 shrink-0" size={24} />
            <span className="font-semibold text-white text-sm leading-tight">
              Task Manager
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
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
    </>
  );
}

export { Menu };
