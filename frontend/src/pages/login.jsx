import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationTimeoutRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [exitDirection, setExitDirection] = useState(null);
  const infoMessage = location.state?.message;
  const entryDirection = location.state?.transition === "from-signup" ? "left" : null;

  const motionClass = [
    "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
    isEntering && entryDirection === "left" ? "md:-translate-x-16 opacity-0" : "",
    isEntering && entryDirection === "right" ? "md:translate-x-16 opacity-0" : "",
    exitDirection === "right" ? "md:translate-x-16 opacity-0" : "",
    exitDirection === "left" ? "md:-translate-x-16 opacity-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const storedUsername = localStorage.getItem("rememberedUsername");
    if (storedUsername) {
      setUsername(storedUsername);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsEntering(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const goToSignup = () => {
    if (exitDirection || loading) return;
    setExitDirection("right");
    navigationTimeoutRef.current = setTimeout(() => {
      navigate("/signup", { state: { transition: "from-login" } });
    }, 460);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userRole", data.user.role);

      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }

      const redirectTo = location.state?.from || "/";
      navigate(redirectTo);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 px-4">
      <div className={`max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${motionClass}`}>
        {/* Left hero section */}
        <div className="space-y-6 hidden md:block">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0 shadow-lg shadow-blue-500/30">
              <ShieldAlert size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-50 whitespace-nowrap">
              ReliefPortal
            </span>
          </div>

          <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs font-medium tracking-wide uppercase">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time relief command center
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Sign in to your
            <span className="block text-emerald-400">Disaster Relief Console</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-md">
            Coordinate disasters, resources, and volunteers from a single, powerful dashboard designed for crisis response teams.
          </p>

          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <p className="font-semibold text-emerald-400 mb-1">Admins</p>
              <p>Control incidents, allocate supplies, and manage teams securely.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <p className="font-semibold text-emerald-400 mb-1">Volunteers</p>
              <p>View operations and stay aligned with the response plan.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <p className="font-semibold text-emerald-400 mb-1">Secure</p>
              <p>Role-based access keeps critical actions in the right hands.</p>
            </div>
          </div>
        </div>

        {/* Right auth card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-8 space-y-6">
          {infoMessage && (
            <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/60 rounded-md px-3 py-2">
              {infoMessage}
            </p>
          )}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-xs text-slate-400">
              Sign in with your admin or volunteer account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="username"
                placeholder="e.g. ops-admin"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-16"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-2 my-1 px-2 text-[11px] font-medium text-slate-300 bg-slate-800/80 rounded-md border border-slate-700 hover:bg-slate-700/80 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span>Remember this device</span>
              </label>

              <Link
                to="/reset-password"
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={goToSignup}
              className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}


