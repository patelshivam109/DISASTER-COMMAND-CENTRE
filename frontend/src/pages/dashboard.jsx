import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Package,
  ShieldAlert,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";
import { apiFetch } from "../api/client";
import { getStoredUser, getUserRole, isLoggedIn } from "../utils/auth";
import { DashboardSkeleton } from "../ui/skeleton";
import { SectionEyebrow, StatusChip, SurfaceCard } from "../ui/surface-card";

function formatRelative(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return "N/A";
  const date = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function safeMax(values) {
  return Math.max(...values, 1);
}

async function fetchDashboard(path, signal) {
  const response = await apiFetch(path, { signal });

  if (!response.ok) {
    let message = "Unable to load dashboard";
    try {
      const payload = await response.json();
      message = payload.error || payload.message || message;
    } catch {
      // Ignore JSON parse failures and use fallback.
    }
    throw new Error(message);
  }

  return response.json();
}

function HeroHighlights({ items }) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-white/10 bg-white/8 px-4 py-3"
        >
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/58">{item.label}</p>
          <p className="mt-2 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">{item.value}</p>
          <p className="mt-2 text-sm text-white/70">{item.help}</p>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, tone = "primary" }) {
  const IconComponent = icon;
  const toneStyles = {
    primary: "text-[var(--accent-primary)]",
    success: "text-[var(--accent-success)]",
    warning: "text-[var(--accent-warning)]",
    danger: "text-[var(--accent-danger)]",
    neutral: "text-[var(--text-primary)]",
  };

  return (
    <SurfaceCard className="p-4 transition duration-200 hover:border-[var(--border-strong)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{title}</p>
          <p className={`mt-3 text-2xl font-bold tracking-tight ${toneStyles[tone]}`}>{value}</p>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{subtitle}</p>
        </div>
            <span className={`metric-orb ${toneStyles[tone]}`}>
              <IconComponent className="h-5 w-5" aria-hidden="true" />
            </span>
      </div>
    </SurfaceCard>
  );
}

function ProgressList({ title, items, emptyMessage, renderMeta }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em]">{title}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Highest-priority records for quick follow-up.</p>
        </div>
        <StatusChip tone="neutral">{items.length} tracked</StatusChip>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="panel-muted px-4 py-5 text-sm text-[var(--text-muted)]">{emptyMessage}</div>
        ) : (
          items.map((item) => (
            <div key={item.key} className="panel-muted px-4 py-3.5">
              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.label}</p>
                  <p className="mt-1 text-[var(--text-muted)]">{item.caption}</p>
                </div>
                <div className="self-start sm:self-auto">{renderMeta(item)}</div>
              </div>
              {typeof item.progress === "number" ? (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-primary),var(--accent-secondary))]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}

function ActivityFeed({ entries, emptyMessage }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Activity</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Recent field and command updates.</p>
        </div>
        <StatusChip tone="success">Live</StatusChip>
      </div>

      <div className="mt-6 space-y-4">
        {entries.length === 0 ? (
          <div className="panel-muted px-4 py-5 text-sm text-[var(--text-muted)]">{emptyMessage}</div>
        ) : (
          entries.map((entry, index) => (
            <div key={entry.id} className="relative pl-7">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-[var(--accent-primary)] shadow-[0_0_0_6px_rgba(51,92,255,0.12)]" />
              {index < entries.length - 1 ? (
                <span className="absolute left-[5px] top-5 h-[calc(100%-0.2rem)] w-px bg-[var(--border-soft)]" />
              ) : null}
              <div className="panel-muted px-4 py-3.5">
                <p className="text-sm font-semibold">{entry.action}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{entry.details || "No additional details recorded."}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">{formatRelative(entry.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const payload = await fetchDashboard("/dashboard/admin", controller.signal);
        setData(payload);
        setError("");
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }
        setError(requestError.message || "Unable to load dashboard");
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const resourceUsage = useMemo(
    () => (data?.resource_usage_per_disaster || []).slice(0, 5),
    [data?.resource_usage_per_disaster]
  );
  const maxResourceUsage = safeMax(resourceUsage.map((item) => item.total_allocated || 0));
  const monthlyHours = data?.volunteer_hours_per_month || [];
  const maxMonthlyHours = safeMax(monthlyHours.map((item) => item.hours || 0));

  if (!data && !error) {
    return <DashboardSkeleton />;
  }

  const totalWarnings = data?.resource_stock_warnings?.length || 0;
  const exhaustedResources = data?.resource_exhausted || [];
  const cards = [
    {
      title: "Active disasters",
      value: data?.total_active_disasters ?? 0,
      subtitle: "Incidents currently moving through the response lifecycle.",
      icon: AlertTriangle,
      tone: "danger",
    },
    {
      title: "Closed incidents",
      value: data?.total_closed_disasters ?? 0,
      subtitle: "Completed response cycles ready for retrospective reporting.",
      icon: CheckCircle2,
      tone: "neutral",
    },
    {
      title: "Volunteers assigned",
      value: data?.total_volunteers_assigned ?? 0,
      subtitle: "People deployed or actively engaged in relief operations.",
      icon: Users,
      tone: "primary",
    },
    {
      title: "Stock warnings",
      value: totalWarnings,
      subtitle: "Inventory entries demanding replenishment attention.",
      icon: Package,
      tone: totalWarnings > 0 ? "warning" : "success",
    },
  ];

  const heroHighlights = [
    {
      label: "Critical watch",
      value: data?.most_critical_disaster?.label || "No active critical incident",
      help: data?.most_critical_disaster
        ? `${data.most_critical_disaster.priority} priority - ${data.most_critical_disaster.affected_display || "0"} impacted`
        : "The queue is clear enough for calmer planning.",
    },
    {
      label: "Recent closures",
      value: `${data?.recently_completed_disasters?.length || 0}`,
      help: "Completed operations archived for faster summary reporting.",
    },
    {
      label: "Resource stress",
      value: exhaustedResources.length ? exhaustedResources.map((item) => item.name).join(", ") : "No exhausted stock",
      help: exhaustedResources.length ? "Immediate replenishment is recommended." : "Inventory pressure is currently manageable.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-panel p-5 text-white sm:p-6">
        <SectionEyebrow>Command view</SectionEyebrow>
        <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-[2.4rem]">
              Response status without the noise.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
              Incidents, stock warnings, and responder activity are grouped for fast decisions under pressure.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="success">Live metrics</StatusChip>
            <StatusChip tone="neutral">Role aware</StatusChip>
            <StatusChip tone="warning">Alerts first</StatusChip>
          </div>
        </div>
        <div className="mt-8">
          <HeroHighlights items={heroHighlights} />
        </div>
      </section>

      {error ? (
        <SurfaceCard className="border-[rgba(190,76,76,0.2)] bg-[rgba(190,76,76,0.08)] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--accent-danger)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Dashboard data is unavailable</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SurfaceCard className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold tracking-tight">Resource burn and volunteer effort</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Two comparisons for current throughput.</p>
            </div>
            <StatusChip tone="primary">Last 12 months</StatusChip>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="panel-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Resource usage by incident</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Top 5 allocations</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              </div>
              <div className="mt-6 space-y-4">
                {resourceUsage.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No resource usage data yet.</p>
                ) : (
                  resourceUsage.map((item) => (
                    <div key={item.disaster_id}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="truncate text-sm font-semibold">{item.disaster_label}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                          {item.total_allocated}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-primary),var(--accent-secondary))]"
                          style={{ width: `${((item.total_allocated || 0) / maxResourceUsage) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Volunteer hours</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Monthly cadence</p>
                </div>
                <Sparkles className="h-4 w-4 text-[var(--accent-secondary)]" aria-hidden="true" />
              </div>
              <div className="mt-6 flex h-48 items-end gap-3">
                {monthlyHours.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No volunteer hour data yet.</p>
                ) : (
                  monthlyHours.map((item) => (
                    <div key={item.month} className="flex min-w-[44px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end rounded-t-[16px] bg-[var(--surface-muted)]">
                        <div
                          className="w-full rounded-t-[16px] bg-[linear-gradient(180deg,var(--accent-secondary),var(--accent-primary))]"
                          style={{ height: `${((item.hours || 0) / maxMonthlyHours) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-semibold text-[var(--text-dim)]">{formatMonthLabel(item.month)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <ProgressList
            emptyMessage="No stock warnings right now."
            items={(data?.resource_stock_warnings || []).slice(0, 4).map((resource) => ({
              key: resource.id,
              label: resource.name,
              caption: resource.location || "No location recorded",
              progress:
                resource.quantity <= 0
                  ? 0
                  : Math.min(
                      100,
                      Math.round(((resource.quantity || 0) / Math.max((resource.low_threshold || 1) * 3, 1)) * 100)
                    ),
              stockLevel: resource.stock_level,
            }))}
            renderMeta={(item) => (
              <StatusChip tone={item.stockLevel === "Critical" ? "danger" : "warning"}>{item.stockLevel}</StatusChip>
            )}
            title="Inventory alerts"
          />

          <ProgressList
            emptyMessage="No recently closed incidents yet."
            items={(data?.recently_completed_disasters || []).map((disaster) => ({
              key: disaster.id,
              label: `${disaster.type} - ${disaster.location}`,
              caption: `Priority ${disaster.priority || "Moderate"} - ${disaster.response_team || "No team assigned"}`,
            }))}
            renderMeta={() => <StatusChip tone="success">Closed</StatusChip>}
            title="Recent closures"
          />
        </div>
      </div>

      <ActivityFeed entries={data?.recent_activity || []} emptyMessage="Activity will appear here once the team begins making updates." />
    </div>
  );
}

function VolunteerProfileCard({ profile }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em]">Responder profile</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Your personal readiness and contact snapshot.</p>
        </div>
        <span className="metric-orb text-[var(--accent-secondary)]">
          <UserCircle2 className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="panel-muted px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Name</p>
          <p className="mt-2 text-sm font-semibold">{profile?.name || "Volunteer"}</p>
        </div>
        <div className="panel-muted px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Phone</p>
          <p className="mt-2 text-sm font-semibold">{profile?.phone || "N/A"}</p>
        </div>
        <div className="panel-muted px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Skills</p>
          <p className="mt-2 text-sm font-semibold">{profile?.skills || "General"}</p>
        </div>
        <div className="panel-muted px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Verification</p>
          <p className="mt-2 text-sm font-semibold">{profile?.verification_status || "Pending"}</p>
        </div>
      </div>
    </SurfaceCard>
  );
}

function VolunteerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const user = getStoredUser();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const payload = await fetchDashboard("/dashboard/volunteer", controller.signal);
        setData(payload);
        setError("");
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }
        setError(requestError.message || "Unable to load volunteer dashboard");
      }
    }

    load();
    return () => controller.abort();
  }, []);

  if (!data && !error) {
    return <DashboardSkeleton />;
  }

  const cards = [
    {
      title: "Assigned disaster",
      value: data?.assigned_disaster?.disaster_label || "Awaiting assignment",
      subtitle: "Current mission focus from the operations team.",
      icon: AlertTriangle,
      tone: data?.assigned_disaster ? "danger" : "neutral",
    },
    {
      title: "Hours logged",
      value: data?.hours_logged || 0,
      subtitle: "Verified contribution recorded against your assignments.",
      icon: Clock3,
      tone: "primary",
    },
    {
      title: "Task status",
      value: data?.task_status || "No active task",
      subtitle: "Latest position in your workflow response cycle.",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      title: "Profile status",
      value: data?.personal_profile?.verification_status || "Pending",
      subtitle: "Verification drives what assignments can be activated.",
      icon: ShieldAlert,
      tone: data?.personal_profile?.verification_status === "Verified" ? "success" : "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-panel p-5 text-white sm:p-6">
        <SectionEyebrow>Volunteer view</SectionEyebrow>
        <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-[2.2rem]">
              Welcome back, {user?.name || user?.username || "responder"}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
              Your mission, logged hours, and profile status stay visible without extra clutter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="primary">Personal dashboard</StatusChip>
            <StatusChip tone="success">{data?.task_status || "Ready"}</StatusChip>
          </div>
        </div>
      </section>

      {error ? (
        <SurfaceCard className="border-[rgba(190,76,76,0.2)] bg-[rgba(190,76,76,0.08)] p-5">
          <p className="font-semibold">Volunteer dashboard data is unavailable</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      {data?.personal_profile?.verification_status !== "Verified" ? (
        <SurfaceCard className="border-[rgba(201,142,33,0.2)] bg-[rgba(201,142,33,0.08)] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--accent-warning)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Verification still pending</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Your account can still be viewed, but assignment controls may remain limited until an administrator verifies the profile.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <ActivityFeed
          entries={data?.recent_activity || []}
          emptyMessage="No personal activity yet. Updates will appear as you accept and complete assignments."
        />
        <VolunteerProfileCard profile={data?.personal_profile} />
      </div>
    </div>
  );
}

function GuestDashboard() {
  const guestHighlights = [
    {
      label: "Guest visibility",
      value: "Dashboard + Disasters",
      help: "You can explore overview information for the first two pages.",
    },
    {
      label: "Full workspace",
      value: "Login required",
      help: "Resources and Volunteers are unlocked only after authentication.",
    },
    {
      label: "Role-based controls",
      value: "Admin / Volunteer",
      help: "Permissions are automatically applied after sign in.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-panel p-5 text-white sm:p-6">
        <SectionEyebrow>Guest overview</SectionEyebrow>
        <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-[2.2rem]">
              Welcome to the Disaster Relief Portal.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
              You are browsing as a guest. Use this page and the disasters page for operational overview, then login for
              assignments, resource controls, and role-specific workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="neutral">Guest mode</StatusChip>
            <StatusChip tone="primary">Overview access</StatusChip>
          </div>
        </div>

        <div className="mt-8">
          <HeroHighlights items={guestHighlights} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Accessible pages"
          value="2"
          subtitle="Dashboard and Disasters are available without authentication."
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          title="Protected pages"
          value="2"
          subtitle="Resources and Volunteers require a logged-in account."
          icon={ShieldAlert}
          tone="warning"
        />
        <MetricCard
          title="Session state"
          value="No saved user"
          subtitle="Refresh-safe guest landing is active when session data is missing."
          icon={Clock3}
          tone="neutral"
        />
        <MetricCard
          title="Next step"
          value="Sign in"
          subtitle="Authenticate to unlock role-based actions and full operations."
          icon={ArrowUpRight}
          tone="primary"
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  if (!isLoggedIn()) {
    return <GuestDashboard />;
  }

  const role = getUserRole();
  return role === "admin" ? <AdminDashboard /> : <VolunteerDashboard />;
}
