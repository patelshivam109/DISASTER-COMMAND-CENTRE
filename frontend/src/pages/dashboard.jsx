import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Package, ShieldAlert, UserCircle2, Users } from "lucide-react";
import { buildRoleHeaders, getUserRole } from "../utils/auth";
import { API_BASE_URL } from "../api/config";

function formatRelative(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return "N/A";
  const date = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        setData({
          total_active_disasters: 0,
          total_closed_disasters: 0,
          total_volunteers_assigned: 0,
          resource_stock_warnings: [],
          resource_exhausted: [],
          recently_completed_disasters: [],
          recent_activity: [],
          active_vs_closed: { active: 0, closed: 0 },
          resource_usage_per_disaster: [],
          volunteer_hours_per_month: [],
          most_critical_disaster: null,
        });
        return;
      }
      setData(await response.json());
    };

    load();
  }, []);

  const resourceUsage = useMemo(
    () => (data?.resource_usage_per_disaster || []).slice(0, 6),
    [data?.resource_usage_per_disaster]
  );
  const maxResourceUsage = Math.max(...resourceUsage.map((item) => item.total_allocated || 0), 1);
  const monthlyHours = data?.volunteer_hours_per_month || [];
  const maxMonthlyHours = Math.max(...monthlyHours.map((item) => item.hours || 0), 1);

  if (!data) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  const cards = [
    {
      title: "Active Disasters",
      value: data.total_active_disasters,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Closed Disasters",
      value: data.total_closed_disasters,
      icon: CheckCircle2,
      color: "text-slate-600",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      title: "Volunteers Assigned",
      value: data.total_volunteers_assigned,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Stock Warnings",
      value: data.resource_stock_warnings.length,
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  const activeCount = data.active_vs_closed?.active || 0;
  const closedCount = data.active_vs_closed?.closed || 0;
  const totalSplit = Math.max(activeCount + closedCount, 1);
  const activeDegree = (activeCount / totalSplit) * 360;

  return (
    <div className="space-y-8 page-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Disaster Operations Dashboard</h1>
        <p className="mt-2 text-blue-100">Analytics view for lifecycle progress, resource burn, and volunteer effort.</p>
      </div>

      {data.resource_exhausted.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-semibold">Resource Exhaustion Alert</p>
          <p className="mt-1">
            {data.resource_exhausted.map((resource) => resource.name).join(", ")} reached zero stock and needs urgent
            replenishment.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.title}</p>
                <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className={`text-3xl font-bold mt-3 ${item.color}`}>{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold">Active vs Closed Disasters</h2>
          <div className="mt-5 flex items-center gap-6">
            <div
              className="h-32 w-32 rounded-full border border-slate-200 dark:border-slate-700"
              style={{
                background: `conic-gradient(#ef4444 0deg ${activeDegree}deg, #64748b ${activeDegree}deg 360deg)`,
              }}
            />
            <div className="space-y-2 text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />
                Active: <strong>{activeCount}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-500 mr-2" />
                Closed: <strong>{closedCount}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold">Most Critical Disaster</h2>
          {!data.most_critical_disaster ? (
            <p className="mt-4 text-sm text-slate-500">No active disaster is currently marked critical.</p>
          ) : (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{data.most_critical_disaster.label}</p>
              <p className="text-xs mt-2 text-red-600 dark:text-red-300">
                Priority: {data.most_critical_disaster.priority} | Status: {data.most_critical_disaster.status}
              </p>
              <p className="text-xs mt-1 text-red-600 dark:text-red-300">
                Affected Population: {data.most_critical_disaster.affected_display || "N/A"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold">Resource Usage per Disaster</h2>
          <div className="mt-4 space-y-3">
            {resourceUsage.length === 0 && <p className="text-sm text-slate-500">No resource usage data yet.</p>}
            {resourceUsage.map((item) => (
              <div key={item.disaster_id}>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate pr-3">{item.disaster_label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{item.total_allocated}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${((item.total_allocated || 0) / maxResourceUsage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold">Volunteer Hours per Month</h2>
          <div className="mt-4 flex items-end gap-3 h-40">
            {monthlyHours.length === 0 && <p className="text-sm text-slate-500">No volunteer hour data yet.</p>}
            {monthlyHours.map((item) => (
              <div key={item.month} className="flex-1 min-w-[56px] flex flex-col justify-end items-center gap-2">
                <div className="w-full bg-cyan-500 rounded-t-md" style={{ height: `${(item.hours / maxMonthlyHours) * 100}%` }} />
                <p className="text-[11px] text-slate-500 text-center">{formatMonthLabel(item.month)}</p>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{item.hours}h</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-semibold">Resource Stock Warnings</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.resource_stock_warnings.length === 0 && (
              <p className="p-5 text-sm text-slate-500">No low or critical stock items.</p>
            )}
            {data.resource_stock_warnings.map((resource) => (
              <div key={resource.id} className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium">{resource.name}</p>
                  <p className="text-sm text-slate-500">{resource.location || "No location"}</p>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                    resource.stock_level === "Critical"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}
                >
                  {resource.stock_level}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-semibold">Recently Closed Disasters</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.recently_completed_disasters.length === 0 && (
              <p className="p-5 text-sm text-slate-500">No recently completed disasters.</p>
            )}
            {data.recently_completed_disasters.map((disaster) => (
              <div key={disaster.id} className="p-4">
                <p className="text-sm font-medium">
                  {disaster.type} - {disaster.location}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Priority: {disaster.priority} | Team: {disaster.response_team || "Unassigned"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">Activity Timeline</h2>
        </div>
        <div className="p-5 max-h-[430px] overflow-y-auto">
          {data.recent_activity.length === 0 && <p className="text-sm text-slate-500">No activity recorded yet.</p>}
          <div className="space-y-4">
            {data.recent_activity.map((entry) => (
              <div key={entry.id} className="relative pl-6">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="absolute left-[5px] top-4 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-700" />
                <p className="text-sm font-medium">{entry.action}</p>
                <p className="text-xs text-slate-500 mt-1">{entry.details || "No additional details"}</p>
                <p className="text-[11px] text-slate-400 mt-1">{formatRelative(entry.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VolunteerDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/volunteer`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        setData({
          assigned_disaster: null,
          hours_logged: 0,
          task_status: "No active task",
          personal_profile: {},
          recent_activity: [],
        });
        return;
      }
      setData(await response.json());
    };
    load();
  }, []);

  if (!data) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  const cards = [
    {
      title: "Assigned Disaster",
      value: data.assigned_disaster?.disaster_label || "Not assigned",
      icon: AlertTriangle,
    },
    { title: "Hours Logged", value: data.hours_logged || 0, icon: Clock3 },
    { title: "Task Status", value: data.task_status || "No task", icon: CheckCircle2 },
    {
      title: "Profile",
      value: data.personal_profile?.name || "Volunteer",
      icon: UserCircle2,
    },
  ];

  return (
    <div className="space-y-8 page-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Volunteer Command View</h1>
        <p className="mt-2 text-cyan-100">Track your assignment, progress, and logged field hours.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.title}</p>
                <Icon size={18} className="text-cyan-600" />
              </div>
              <p className="text-lg font-semibold mt-3">{item.value}</p>
            </div>
          );
        })}
      </div>

      {data.personal_profile?.verification_status !== "Verified" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5" />
            <p>Your volunteer profile is pending verification. Assignment options may be limited.</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">Recent Personal Activity</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.recent_activity.length === 0 && <p className="p-5 text-sm text-slate-500">No activity yet.</p>}
          {data.recent_activity.map((entry) => (
            <div key={entry.id} className="p-4">
              <p className="text-sm font-medium">{entry.action}</p>
              <p className="text-xs text-slate-500 mt-1">{entry.details || "No additional details"}</p>
              <p className="text-[11px] text-slate-400 mt-1">{formatRelative(entry.created_at)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="font-semibold mb-3">Personal Profile Info</h2>
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <p>Name: {data.personal_profile?.name || "Volunteer"}</p>
          <p>Phone: {data.personal_profile?.phone || "N/A"}</p>
          <p>Skills: {data.personal_profile?.skills || "General"}</p>
          <p>Verification: {data.personal_profile?.verification_status || "Pending"}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const role = getUserRole();
  return role === "admin" ? <AdminDashboard /> : <VolunteerDashboard />;
}
