import { BrainCircuit, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrainCircuit className="text-brand-500" size={30} />
          <span className="text-xl font-bold text-white">Job Scheduler</span>
        </div>

        <div className="card">
          <h1 className="text-lg font-semibold text-white mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-6">Join as a worker or admin</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input pr-10"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
