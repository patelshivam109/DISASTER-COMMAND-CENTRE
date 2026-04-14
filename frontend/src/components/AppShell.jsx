import { useEffect, useMemo, useState } from "react";
import { Menu, Search, Shield, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getStoredUser, getUserRole, isLoggedIn } from "../utils/auth";

const PAGE_META = {
  "/": {
    title: "Operational Overview",
    description: "Monitor the command center, resource pressure, and volunteer momentum in one glance.",
    seoTitle: "Disaster Relief Portal | Operational Overview",
    seoDescription:
      "Track live disaster response overview, incident status, and readiness summaries in the Disaster Relief Portal.",
  },
  "/disasters": {
    title: "Incident Map",
    description: "Track field incidents, lifecycle stage, and live operational activity.",
    seoTitle: "Disaster Relief Portal | Incident Map",
    seoDescription:
      "View disaster incidents, locations, status transitions, and operational updates in one responsive map-driven workspace.",
  },
  "/resources": {
    title: "Resource Allocation",
    description: "Balance stock levels, allocations, and exhaustion risk across active disasters.",
    seoTitle: "Disaster Relief Portal | Resource Allocation",
    seoDescription:
      "Manage relief inventory, stock thresholds, and resource allocation history for active disaster operations.",
  },
  "/volunteers": {
    title: "Volunteer Network",
    description: "Coordinate verification, assignments, and task progress with a calmer workflow.",
    seoTitle: "Disaster Relief Portal | Volunteer Network",
    seoDescription:
      "Coordinate volunteer profiles, verification, assignments, and response progress through a centralized operations console.",
  },
};

export default function AppShell({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const hasSession = isLoggedIn();
  const user = getStoredUser();
  const role = hasSession ? getUserRole() : "guest";

  const pageMeta = useMemo(
    () =>
      PAGE_META[location.pathname] || {
        title: "Command Center",
        description: "Keep operations aligned with a fast, focused workflow.",
        seoTitle: "Disaster Relief Portal",
        seoDescription:
          "A modern disaster response command center for managing incidents, resources, and volunteer operations.",
      },
    [location.pathname]
  );

  useEffect(() => {
    document.title = pageMeta.seoTitle;

    const ensureMeta = (name, attr = "name") => {
      let element = document.head.querySelector(`meta[${attr}='${name}']`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      return element;
    };

    ensureMeta("description").setAttribute("content", pageMeta.seoDescription);
    ensureMeta("og:title", "property").setAttribute("content", pageMeta.seoTitle);
    ensureMeta("og:description", "property").setAttribute("content", pageMeta.seoDescription);
    ensureMeta("og:url", "property").setAttribute("content", window.location.href);
    ensureMeta("twitter:title").setAttribute("content", pageMeta.seoTitle);
    ensureMeta("twitter:description").setAttribute("content", pageMeta.seoDescription);

    let canonical = document.head.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, [pageMeta]);

  return (
    <div className="app-shell text-[var(--text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--surface-strong)] focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-3 px-2 pb-4 sm:px-3 md:gap-4 md:px-5">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-3 py-2 md:gap-4 md:py-3">
          <header className="panel-surface sticky top-2 z-30 rounded-[20px] px-3 py-3 sm:px-4 md:top-[5.5rem] md:rounded-[24px] md:px-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-2.5 md:gap-3">
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
                  <h1 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.03em] sm:text-[1.55rem] md:text-[1.8rem]">
                    {pageMeta.title}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-[0.92rem]">
                    {pageMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <label className="panel-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] md:min-w-[220px] md:w-auto">
                  <Search className="h-4 w-4" />
                  <span className="truncate">Focused operations workspace</span>
                </label>

                <div className="panel-muted flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-2.5 md:w-auto md:gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="metric-orb h-10 w-10 rounded-xl">
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

          <main id="main-content" className="page-transition flex-1 pb-5">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
