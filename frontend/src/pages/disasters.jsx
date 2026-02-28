import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  MapPin,
  AlertTriangle,
  Users,
  Activity,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRoleHeaders, isAdmin } from "../utils/auth";

const MOCK_DISASTERS = [
  {
    id: 1,
    title: "Coastal Flood Warning",
    location: "Kerala, India",
    severity: "Critical",
    status: "Active",
    affected: "12,000+",
    type: "Flood",
    lastUpdate: "10 mins ago",
  },
  {
    id: 2,
    title: "Urban Fire Outbreak",
    location: "Mumbai, Mahim",
    severity: "High",
    status: "Active",
    affected: "450",
    type: "Fire",
    lastUpdate: "2 hours ago",
  },
  {
    id: 3,
    title: "Magnitude 4.5 Earthquake",
    location: "Assam Region",
    severity: "Moderate",
    status: "Recovering",
    affected: "2,300",
    type: "Earthquake",
    lastUpdate: "1 day ago",
  },
];

const getSeverityColor = (severity) => {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  }
};

const getStatusColor = (status) => {
  if (status === "Active") return "text-green-600 dark:text-green-400";
  if (status === "Critical") return "text-red-600 dark:text-red-400";
  return "text-gray-500 dark:text-gray-400";
};

const API_BASE_URL = "http://localhost:5000/api";

const Disasters = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageDisasters = isAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [disasters, setDisasters] = useState(MOCK_DISASTERS);
  const [isCreating, setIsCreating] = useState(false);
  const [newDisaster, setNewDisaster] = useState({
    type: "",
    location: "",
    severity: "Moderate",
    priority: "Moderate",
    status: "Active",
    response_team: "",
    date: "",
  });

  const requireAuth = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: "Login required to report or update incidents.",
        },
      });
      return false;
    }
    return true;
  };

  const loadDisasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/disasters`);
      if (!response.ok) {
        throw new Error("Failed to fetch disasters");
      }

      const data = await response.json();
      const mapped = data.map((item, index) => ({
        id: item.id ?? index + 1,
        title: `${item.type} - ${item.location}`,
        location: item.location,
        severity: item.priority || item.severity || "Moderate",
        status: item.status || "Active",
        affected: item.affected || "N/A",
        type: item.type,
        lastUpdate: item.lastUpdate || item.date || "Just now",
      }));

      setDisasters(mapped);
    } catch (error) {
      console.error("Error fetching disasters from backend, using mock data instead:", error);
      setDisasters(MOCK_DISASTERS);
    }
  };

  useEffect(() => {
    loadDisasters();
  }, []);

  const filteredDisasters = disasters.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Disaster Operations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Monitor active incidents and allocate response teams.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          onClick={() => {
            if (!requireAuth()) return;
            if (!canManageDisasters) return;
            setIsCreating((prev) => !prev);
          }}
        >
          {canManageDisasters ? (isCreating ? "Cancel" : "+ Report New Incident") : "View Incidents"}
        </button>
      </div>

      {isCreating && canManageDisasters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Type
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.type}
                onChange={(e) => setNewDisaster({ ...newDisaster, type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.location}
                onChange={(e) => setNewDisaster({ ...newDisaster, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.priority}
                onChange={(e) =>
                  setNewDisaster({
                    ...newDisaster,
                    priority: e.target.value,
                    severity: e.target.value,
                  })
                }
              >
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.status}
                onChange={(e) => setNewDisaster({ ...newDisaster, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Recovering">Recovering</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.date}
                onChange={(e) => setNewDisaster({ ...newDisaster, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Response Team
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDisaster.response_team}
                onChange={(e) =>
                  setNewDisaster({ ...newDisaster, response_team: e.target.value })
                }
                placeholder="e.g. Team Alpha"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm cursor-pointer"
              onClick={async () => {
                if (!requireAuth()) return;
                if (!canManageDisasters) return;

                try {
                  const response = await fetch(`${API_BASE_URL}/disasters`, {
                    method: "POST",
                    headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(newDisaster),
                  });
                  if (!response.ok) throw new Error("Failed to create disaster");
                  await loadDisasters();
                  setIsCreating(false);
                  setNewDisaster({
                    type: "",
                    location: "",
                    severity: "Moderate",
                    priority: "Moderate",
                    status: "Active",
                    response_team: "",
                    date: "",
                  });
                } catch (error) {
                  console.error("Error creating disaster:", error);
                }
              }}
            >
              Save Incident
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer w-full md:w-auto">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer w-full"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Recovering">Recovering</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDisasters.map((disaster) => (
          <div
            key={disaster.id}
            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(disaster.severity)}`}
              >
                {disaster.severity} Priority
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {disaster.title}
            </h3>

            <div className="space-y-2 mt-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-2" />
                {disaster.location}
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2" />
                {disaster.affected} Affected
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Activity className="h-4 w-4 mr-2" />
                Status:{" "}
                <span className={`ml-1 font-medium ${getStatusColor(disaster.status)}`}>
                  {disaster.status}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-400">
              <span>Updated {disaster.lastUpdate}</span>
              <div className="flex items-center gap-3">
                <button
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center"
                  onClick={() => navigate("/resources")}
                >
                  Manage Operation
                </button>
                {canManageDisasters && (
                  <button
                    className="text-red-600 dark:text-red-400 font-medium hover:underline"
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE_URL}/disasters/${disaster.id}`, {
                          method: "DELETE",
                          headers: buildRoleHeaders(),
                        });
                        await loadDisasters();
                      } catch (error) {
                        console.error("Error deleting disaster:", error);
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDisasters.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No disasters found matching your criteria.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("All");
            }}
            className="mt-2 text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Disasters;

