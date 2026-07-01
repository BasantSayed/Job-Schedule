import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
