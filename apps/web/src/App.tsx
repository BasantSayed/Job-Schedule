import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { Calendar } from "./pages/Calendar";
import { Dashboard } from "./pages/Dashboard";
import { Kanban } from "./pages/Kanban";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.VITE_BASE_PATH ?? "/"}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Kanban />} />
            <Route path="/calendar" element={<Calendar />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
