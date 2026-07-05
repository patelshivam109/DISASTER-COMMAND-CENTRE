import { useEffect, useMemo, useState } from "react";
import { Menu, Search, Shield, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getStoredUser, getUserRole, isLoggedIn } from "../utils/auth";

const PAGE_META = {
  "/": {
    title: "Operations Overview",
    description: "Current incidents, stock pressure, and responder activity in one clear workspace.",
    seoTitle: "ResQlink | Operational Overview",
    seoDescription:
      "Track live disaster response overview, incident status, and readiness summaries in ResQlink.",
  },
  "/disasters": {
    title: "Incidents",
    description: "Track location, severity, lifecycle stage, and field updates.",
    seoTitle: "ResQlink | Incident Map",
    seoDescription:
      "View disaster incidents, locations, status transitions, and operational updates in one responsive map-driven workspace.",
  },
  "/resources": {
    title: "Resources",
    description: "Manage inventory, allocations, and replenishment risk.",
    seoTitle: "ResQlink | Resource Allocation",
    seoDescription:
      "Manage relief inventory, stock thresholds, and resource allocation history for active disaster operations.",
  },
  "/volunteers": {
    title: "Volunteers",
    description: "Verify people, assign work, and monitor progress.",
    seoTitle: "ResQlink | Volunteer Network",
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
        description: "Keep response work aligned with a focused workflow.",
        seoTitle: "ResQlink",
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
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-3 px-2 pb-4 sm:px-3 md:gap-4 md:px-4">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-3 py-2 md:gap-4">
          <header className="panel-surface sticky top-2 z-30 px-3 py-3 sm:px-4 md:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-2.5 md:gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                    ResQlink
                  </p>
                  <h1 className="mt-1 text-[1.3rem] font-bold tracking-tight sm:text-[1.45rem] md:text-[1.65rem]">
                    {pageMeta.title}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                    {pageMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <label className="panel-muted flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] md:min-w-[220px] md:w-auto">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">Operations workspace</span>
                </label>

                <div className="panel-muted flex w-full items-center justify-between gap-3 px-3 py-2 md:w-auto md:gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="metric-orb h-9 w-9">
                      <Shield className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user?.name || user?.username || "Relief operator"}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">{role}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] lg:hidden"
                    aria-label="Close navigation"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main id="main-content" className="page-transition flex-1 pb-5">
            <div className="space-y-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
