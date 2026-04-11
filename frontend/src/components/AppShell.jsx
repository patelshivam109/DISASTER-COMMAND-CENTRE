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
      <div className="mx-auto flex min-h-screen max-w-[1480px] gap-4 px-3 pb-5 sm:px-4 md:gap-5 md:px-6">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-h-screen flex-1 flex-col gap-4 py-3 md:gap-5 md:py-4">
          <header className="panel-surface sticky top-3 z-30 rounded-[24px] px-4 py-4 sm:px-5 md:top-[5.75rem] md:rounded-[28px] md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                    Disaster Relief Command Center
                  </p>
                  <h1 className="mt-1 text-[1.6rem] font-extrabold tracking-[-0.03em] sm:text-2xl md:text-[2rem]">
                    {pageMeta.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-[0.95rem]">
                    {pageMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <label className="panel-muted flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--text-muted)] md:min-w-[220px] md:w-auto">
                  <Search className="h-4 w-4" />
                  <span className="truncate">Focused operations workspace</span>
                </label>

                <div className="panel-muted flex w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 md:w-auto md:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="metric-orb h-11 w-11 rounded-2xl">
                      <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user?.name || user?.username || "Relief operator"}</p>
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
