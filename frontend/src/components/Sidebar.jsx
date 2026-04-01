import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  Users,
  X,
  Package,
} from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";
import { getStoredUser, getUserRole, isLoggedIn } from "../utils/auth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/disasters", label: "Disasters", icon: AlertTriangle },
  { to: "/resources", label: "Resources", icon: Package },
  { to: "/volunteers", label: "Volunteers", icon: Users },
];

export default function Sidebar({ isOpen, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useDarkMode();
  const navigate = useNavigate();
  const hasUser = isLoggedIn();
  const user = getStoredUser();
  const role = hasUser ? getUserRole() : "guest";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    navigate("/login");
    onClose?.();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/38 backdrop-blur-sm transition duration-300 lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`panel-surface fixed inset-y-4 left-4 z-50 flex w-[294px] flex-col rounded-[32px] px-4 py-4 transition duration-300 lg:sticky lg:top-4 lg:z-20 lg:h-[calc(100vh-2rem)] lg:translate-x-0 ${
          isCollapsed ? "lg:w-[108px]" : "lg:w-[294px]"
        } ${isOpen ? "translate-x-0" : "-translate-x-[120%]"} `}
      >
        <div className="flex items-start justify-between gap-3 px-2 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#355dff,#1bb39a)] text-white shadow-[0_16px_35px_rgba(37,99,235,0.28)]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-lg font-extrabold tracking-[-0.04em]">ReliefPortal</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-dim)]">Ops Console</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="panel-muted mb-5 rounded-[24px] p-4">
          {!isCollapsed ? (
            <>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Response status
              </p>
              <p className="mt-2 text-sm font-semibold">Coordinated field operations</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Clean routing, faster route loading, and focused controls for each role.
              </p>
            </>
          ) : (
            <div className="flex justify-center">
              <span className="status-chip">
                <span className="status-dot bg-[var(--accent-success)]" />
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 rounded-[22px] px-3 py-3.5 text-sm font-semibold transition duration-200",
                    isActive
                      ? "bg-[linear-gradient(135deg,rgba(51,92,255,0.16),rgba(26,163,138,0.12))] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]"
                      : "text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.42)] hover:text-[var(--text-primary)]",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`metric-orb h-11 w-11 rounded-[18px] ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                    {isCollapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 scale-95 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-soft)] transition group-hover:scale-100 group-hover:opacity-100">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-5 space-y-3 border-t border-[var(--border-soft)] pt-5">
          {!isCollapsed && (
            <div className="panel-muted rounded-[22px] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Signed in as</p>
              <p className="mt-2 text-sm font-semibold">{user?.name || user?.username || "Guest"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-dim)]">{role}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDark((previous) => !previous)}
            className={`panel-muted flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 ${isCollapsed ? "justify-center" : "justify-between"}`}
          >
            {!isCollapsed && <span>{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>}
            {isDark ? <Sun className="h-4 w-4 text-[var(--accent-warning)]" /> : <Moon className="h-4 w-4 text-[var(--accent-primary)]" />}
          </button>

          <button
            type="button"
            onClick={hasUser ? handleLogout : () => navigate("/login")}
            className={`flex w-full items-center gap-3 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] ${isCollapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-4 w-4 text-[var(--accent-danger)]" />
            {!isCollapsed && <span>{hasUser ? "Log out" : "Open login"}</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          className="absolute -right-3 top-24 hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-strong)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] transition hover:text-[var(--text-primary)] lg:inline-flex"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>
    </>
  );
}
