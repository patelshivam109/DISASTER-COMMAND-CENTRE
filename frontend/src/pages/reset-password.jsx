import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AUTH_API_BASE_URL } from "../api/config";

export default function ResetPassword() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");

    if (!identifier) {
      setError("Please enter your email or username.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${AUTH_API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not start password reset.");
        return;
      }

      setStatus(
        "If an account exists for that email or username, a reset link has been sent."
      );
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 px-4">
      <div className="max-w-lg w-full space-y-6 bg-slate-900/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0 shadow-lg shadow-blue-500/30">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-50">
              ReliefPortal
            </h1>
            <p className="text-xs text-slate-400">Account security center</p>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Reset your password</h2>
          <p className="text-xs text-slate-400">
            Enter the email address or username associated with your account. If it
            exists, we&apos;ll send instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email or Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.org or ops-admin"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {status && (
            <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/60 rounded-md px-3 py-2">
              {status}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {loading ? "Sending instructions..." : "Send reset instructions"}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-400 mt-4">
          <Link to="/login" className="hover:text-emerald-300 hover:underline">
            Back to login
          </Link>
          <p>
            Need an account?{" "}
            <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
