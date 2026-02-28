import { useEffect, useState } from "react";
import { AlertTriangle, Users, Package } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

export default function Dashboard() {
  const [stats, setStats] = useState([
    {
      title: "Active Disasters",
      value: 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Resources Deployed",
      value: 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Volunteers Active",
      value: 0,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
  ]);

  const [disasters, setDisasters] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [disRes, resRes, volRes] = await Promise.all([
          fetch(`${API_BASE_URL}/disasters`),
          fetch(`${API_BASE_URL}/resources`),
          fetch(`${API_BASE_URL}/volunteers`),
        ]);

        const [disastersData, resourcesData, volunteersData] = await Promise.all([
          disRes.ok ? disRes.json() : Promise.resolve([]),
          resRes.ok ? resRes.json() : Promise.resolve([]),
          volRes.ok ? volRes.json() : Promise.resolve([]),
        ]);

        setStats((prev) => [
          { ...prev[0], value: disastersData.length },
          { ...prev[1], value: resourcesData.length },
          { ...prev[2], value: volunteersData.length },
        ]);

        const mappedDisasters = disastersData.map((d) => ({
          name: `${d.type} – ${d.location}`,
          severity: d.severity || "Medium",
          status: "Active",
        }));

        setDisasters(mappedDisasters);
      } catch (error) {
        console.error("Error loading dashboard data from backend:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-10 page-fade-in">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight">
          Disaster Relief Command Center
        </h1>
        <p className="mt-2 max-w-2xl text-blue-100">
          Centralized monitoring and coordination of disaster response
          operations in real time.
        </p>

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="group bg-white dark:bg-slate-900 rounded-2xl p-6
              border border-slate-200 dark:border-slate-800
              transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {item.title}
                </p>
                <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                  <Icon size={20} />
                </div>
              </div>

              <p className={`text-4xl font-bold mt-4 ${item.color}`}>
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* DISASTER LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold">Ongoing Disasters</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Current disaster events and operational status
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {disasters.map((d, i) => (
            <div
              key={i}
              className="p-6 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Severity:{" "}
                  <span
                    className={
                      d.severity === "High"
                        ? "text-red-600 font-medium"
                        : d.severity === "Medium"
                        ? "text-yellow-600 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {d.severity}
                  </span>
                </p>
              </div>

              <span
                className={
                  d.status === "Active"
                    ? "px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium"
                    : "px-3 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-medium"
                }
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}