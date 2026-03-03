import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Package, UserCircle2, Users } from "lucide-react";
import { buildRoleHeaders, getUserRole } from "../utils/auth";

const API_BASE_URL = "http://localhost:5000/api";

function formatRelative(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
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
          total_volunteers_assigned: 0,
          resource_stock_warnings: [],
          recently_completed_disasters: [],
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
      title: "Total Active Disasters",
      value: data.total_active_disasters,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Total Volunteers Assigned",
      value: data.total_volunteers_assigned,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Resource Stock Warnings",
      value: data.resource_stock_warnings.length,
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Recently Completed Disasters",
      value: data.recently_completed_disasters.length,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
  ];

  return (
    <div className="space-y-8 page-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Disaster Operations Dashboard</h1>
        <p className="mt-2 text-blue-100">Monitor active incidents, team assignments, and supply pressure points.</p>
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
            <h2 className="font-semibold">Recently Completed Disasters</h2>
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

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-semibold">Recent Activity Feed</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {data.recent_activity.length === 0 && (
              <p className="p-5 text-sm text-slate-500">No activity recorded yet.</p>
            )}
            {data.recent_activity.map((entry) => (
              <div key={entry.id} className="p-4">
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">Recent Personal Activity</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.recent_activity.length === 0 && (
            <p className="p-5 text-sm text-slate-500">No activity yet.</p>
          )}
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
