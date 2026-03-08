import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/auth";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationTimeoutRef = useRef(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [exitDirection, setExitDirection] = useState(null);
  const entryDirection = location.state?.transition === "from-login" ? "right" : null;

  const motionClass = [
    "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
    isEntering && entryDirection === "right" ? "md:translate-x-16 opacity-0" : "",
    isEntering && entryDirection === "left" ? "md:-translate-x-16 opacity-0" : "",
    exitDirection === "left" ? "md:-translate-x-16 opacity-0" : "",
    exitDirection === "right" ? "md:translate-x-16 opacity-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

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

  const goToLogin = () => {
    if (exitDirection || loading) return;
    setExitDirection("left");
    navigationTimeoutRef.current = setTimeout(() => {
      navigate("/login", { state: { transition: "from-signup" } });
    }, 460);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, skills }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userRole", data.user.role);
      navigate("/", {
        state: { message: "Registration submitted. Admin approval is required before assignment." },
      });
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 px-4">
      <div className={`max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${motionClass}`}>
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
            Join the response network
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Register as a
            <span className="block text-emerald-400">Volunteer Responder</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-md">
            Create your volunteer account to receive assignments and contribute to disaster response efforts.
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Volunteer registration</h2>
            <p className="text-xs text-slate-400 mt-1">Admin approval is required before assignment.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Choose a strong password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Skills (Optional)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-900 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="First aid, logistics, rescue"
              />
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
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center">
            Already have an account?{" "}
            <button
              type="button"
              onClick={goToLogin}
              className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
