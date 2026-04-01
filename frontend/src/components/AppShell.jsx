import { useMemo, useState } from "react";
import { Menu, Search, Shield, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getStoredUser, getUserRole } from "../utils/auth";

const PAGE_META = {
  "/": {
    title: "Operational Overview",
    description: "Monitor the command center, resource pressure, and volunteer momentum in one glance.",
  },
  "/disasters": {
    title: "Incident Map",
    description: "Track field incidents, lifecycle stage, and live operational activity.",
  },
  "/resources": {
    title: "Resource Allocation",
    description: "Balance stock levels, allocations, and exhaustion risk across active disasters.",
  },
  "/volunteers": {
    title: "Volunteer Network",
    description: "Coordinate verification, assignments, and task progress with a calmer workflow.",
  },
};

export default function AppShell({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const user = getStoredUser();
  const role = getUserRole();

  const pageMeta = useMemo(
    () =>
      PAGE_META[location.pathname] || {
        title: "Command Center",
        description: "Keep operations aligned with a fast, focused workflow.",
      },
    [location.pathname]
  );

  return (
    <div className="app-shell text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-[1480px] gap-5 px-4 pb-6 md:px-6">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-h-screen flex-1 flex-col gap-5 py-4">
          <header className="panel-surface sticky top-[5.75rem] z-30 rounded-[28px] px-5 py-4 md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                    Disaster Relief Command Center
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] md:text-[2rem]">
                    {pageMeta.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                    {pageMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="panel-muted flex min-w-[220px] items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--text-muted)]">
                  <Search className="h-4 w-4" />
                  <span className="truncate">Focused operations workspace</span>
                </label>

                <div className="panel-muted flex items-center justify-between gap-4 rounded-[24px] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="metric-orb h-11 w-11 rounded-2xl">
                      <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{user?.name || user?.username || "Relief operator"}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">{role}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="page-transition flex-1 pb-6">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
