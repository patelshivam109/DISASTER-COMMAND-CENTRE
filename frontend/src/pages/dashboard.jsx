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
import { API_BASE_URL } from "../api/config";
import { buildRoleHeaders, getStoredUser, getUserRole } from "../utils/auth";
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildRoleHeaders(),
    signal,
  });

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
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
        >
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/58">{item.label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">{item.value}</p>
          <p className="mt-2 text-sm text-white/70">{item.help}</p>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = "primary" }) {
  const toneStyles = {
    primary: "text-[var(--accent-primary)]",
    success: "text-[var(--accent-success)]",
    warning: "text-[var(--accent-warning)]",
    danger: "text-[var(--accent-danger)]",
    neutral: "text-[var(--text-primary)]",
  };

  return (
    <SurfaceCard className="rounded-[28px] p-5 transition duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{title}</p>
          <p className={`mt-4 text-[2rem] font-extrabold tracking-[-0.04em] ${toneStyles[tone]}`}>{value}</p>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{subtitle}</p>
        </div>
        <span className={`metric-orb ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </SurfaceCard>
  );
}

function ProgressList({ title, items, emptyMessage, renderMeta }) {
  return (
    <SurfaceCard className="rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em]">{title}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Focused view for the highest-signal records only.</p>
        </div>
        <StatusChip tone="neutral">{items.length} tracked</StatusChip>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="panel-muted rounded-[22px] px-4 py-6 text-sm text-[var(--text-muted)]">{emptyMessage}</div>
        ) : (
          items.map((item) => (
            <div key={item.key} className="panel-muted rounded-[22px] px-4 py-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.label}</p>
                  <p className="mt-1 text-[var(--text-muted)]">{item.caption}</p>
                </div>
                {renderMeta(item)}
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
    <SurfaceCard className="rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em]">Activity Pulse</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Recent operational changes from the field and command side.</p>
        </div>
        <StatusChip tone="success">Live</StatusChip>
      </div>

      <div className="mt-6 space-y-4">
        {entries.length === 0 ? (
          <div className="panel-muted rounded-[22px] px-4 py-6 text-sm text-[var(--text-muted)]">{emptyMessage}</div>
        ) : (
          entries.map((entry, index) => (
            <div key={entry.id} className="relative pl-7">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-[var(--accent-primary)] shadow-[0_0_0_6px_rgba(51,92,255,0.12)]" />
              {index < entries.length - 1 ? (
                <span className="absolute left-[5px] top-5 h-[calc(100%-0.2rem)] w-px bg-[var(--border-soft)]" />
              ) : null}
              <div className="panel-muted rounded-[20px] px-4 py-4">
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
      <section className="hero-panel rounded-[32px] p-8 text-white">
        <SectionEyebrow>Portfolio-grade command view</SectionEyebrow>
        <div className="mt-6 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-extrabold tracking-[-0.05em] md:text-[3.4rem]">
              Operations clarity for fast-moving disaster response.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              See pressure points, incident flow, and resource burn without making the interface feel noisy or generic.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="success">Realtime metrics</StatusChip>
            <StatusChip tone="neutral">Role-aware dashboard</StatusChip>
            <StatusChip tone="warning">Alerts surfaced first</StatusChip>
          </div>
        </div>
        <div className="mt-8">
          <HeroHighlights items={heroHighlights} />
        </div>
      </section>

      {error ? (
        <SurfaceCard className="rounded-[24px] border-[rgba(190,76,76,0.2)] bg-[rgba(190,76,76,0.08)] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--accent-danger)]" />
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
        <SurfaceCard className="rounded-[28px] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold tracking-[-0.02em]">Resource burn and volunteer effort</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Operational throughput condensed into two quick comparisons.</p>
            </div>
            <StatusChip tone="primary">Last 12 months</StatusChip>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="panel-muted rounded-[24px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Resource usage by incident</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Top 5 allocations</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--accent-primary)]" />
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

            <div className="panel-muted rounded-[24px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Volunteer hours</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Monthly cadence</p>
                </div>
                <Sparkles className="h-4 w-4 text-[var(--accent-secondary)]" />
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
              label: `${disaster.type} · ${disaster.location}`,
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
    <SurfaceCard className="rounded-[28px] p-6">
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
        <div className="panel-muted rounded-[22px] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Name</p>
          <p className="mt-2 text-sm font-semibold">{profile?.name || "Volunteer"}</p>
        </div>
        <div className="panel-muted rounded-[22px] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Phone</p>
          <p className="mt-2 text-sm font-semibold">{profile?.phone || "N/A"}</p>
        </div>
        <div className="panel-muted rounded-[22px] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">Skills</p>
          <p className="mt-2 text-sm font-semibold">{profile?.skills || "General"}</p>
        </div>
        <div className="panel-muted rounded-[22px] px-4 py-4">
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
      <section className="hero-panel rounded-[32px] p-8 text-white">
        <SectionEyebrow>Volunteer cockpit</SectionEyebrow>
        <div className="mt-6 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-extrabold tracking-[-0.05em] md:text-[3.2rem]">
              Welcome back, {user?.name || user?.username || "responder"}.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              Stay focused on the mission, track your logged effort, and keep your response profile deployment-ready.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="primary">Personal dashboard</StatusChip>
            <StatusChip tone="success">{data?.task_status || "Ready"}</StatusChip>
          </div>
        </div>
      </section>

      {error ? (
        <SurfaceCard className="rounded-[24px] border-[rgba(190,76,76,0.2)] bg-[rgba(190,76,76,0.08)] p-5">
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
        <SurfaceCard className="rounded-[26px] border-[rgba(201,142,33,0.2)] bg-[rgba(201,142,33,0.08)] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--accent-warning)]" />
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

export default function Dashboard() {
  const role = getUserRole();
  return role === "admin" ? <AdminDashboard /> : <VolunteerDashboard />;
}
