import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Filter, MapPin, Search, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRoleHeaders, isAdmin } from "../utils/auth";

const API_BASE_URL = "http://localhost:5000/api";
const LIFECYCLE = ["Created", "Active", "Recovering", "Closed"];

const getSeverityColor = (severity) => {
  const level = (severity || "").toLowerCase();
  if (level === "critical") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  }
  if (level === "high") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
  }
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
};

const getStatusColor = (status) => {
  if (status === "Created") return "text-blue-600 dark:text-blue-400";
  if (status === "Active") return "text-green-600 dark:text-green-400";
  if (status === "Recovering") return "text-amber-600 dark:text-amber-400";
  if (status === "Closed") return "text-slate-500 dark:text-slate-400";
  return "text-gray-500 dark:text-gray-400";
};

function formatDate(value) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

async function getApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export default function Disasters() {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageDisasters = isAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [disasters, setDisasters] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDisasterId, setSelectedDisasterId] = useState(null);
  const [operationData, setOperationData] = useState(null);
  const [operationError, setOperationError] = useState("");
  const [operationNotice, setOperationNotice] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [affectedModalOpen, setAffectedModalOpen] = useState(false);
  const [affectedDraft, setAffectedDraft] = useState("");
  const [affectedSaving, setAffectedSaving] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [newDisaster, setNewDisaster] = useState({
    type: "",
    location: "",
    severity: "Moderate",
    priority: "Moderate",
    status: "Created",
    response_team: "",
    affected_display: "0",
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
      const response = await fetch(`${API_BASE_URL}/disasters`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch disasters");
      }
      const data = await response.json();
      const mapped = data
        .filter((item) => item.type !== "General")
        .map((item) => ({
          id: item.id,
          title: `${item.type} - ${item.location}`,
          location: item.location,
          severity: item.priority || item.severity || "Moderate",
          status: item.status || "Active",
          affected_display: item.affected_display || "0",
          type: item.type,
          date: item.date || item.created_at || "Just now",
          assigned_volunteers_count: item.assigned_volunteers_count || 0,
          allocated_resources_count: item.allocated_resources_count || 0,
        }));
      setDisasters(mapped);
    } catch (error) {
      console.error("Error fetching disasters:", error);
      setDisasters([]);
    }
  };

  const loadDisasterOperations = async (disasterId) => {
    setOperationError("");
    setOperationNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/disasters/${disasterId}/operations`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to load operation details");
      }
      const data = await response.json();
      setOperationData(data);
    } catch (error) {
      console.error("Error loading disaster operations:", error);
      setOperationData(null);
    }
  };

  useEffect(() => {
    loadDisasters();
  }, []);

  const getNextLifecycleStatus = (status) => {
    const currentIndex = LIFECYCLE.indexOf(status);
    if (currentIndex < 0 || currentIndex >= LIFECYCLE.length - 1) return null;
    return LIFECYCLE[currentIndex + 1];
  };

  const moveDisasterToNextStage = async () => {
    if (!selectedDisasterId || !operationData?.disaster?.status) return;
    const nextStatus = getNextLifecycleStatus(operationData.disaster.status);
    if (!nextStatus) return;

    setOperationError("");
    setOperationNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/disasters/${selectedDisasterId}`, {
        method: "PATCH",
        headers: buildRoleHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to update disaster status");
        setOperationError(message);
        return;
      }

      setOperationNotice(`Disaster moved to ${nextStatus}.`);
      await loadDisasters();
      await loadDisasterOperations(selectedDisasterId);
    } catch (error) {
      console.error("Error updating disaster status:", error);
      setOperationError("Failed to update disaster status.");
    }
  };

  const generateReport = async () => {
    if (!selectedDisasterId) return;
    setReportLoading(true);
    setOperationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/disasters/${selectedDisasterId}/report`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to generate report");
        setOperationError(message);
        return;
      }
      const payload = await response.json();
      setReportData(payload.report || null);
      setOperationNotice("Report generated successfully.");
    } catch (error) {
      console.error("Error generating report:", error);
      setOperationError("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReportPdf = async () => {
    if (!selectedDisasterId) return;
    setOperationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/disasters/${selectedDisasterId}/report/pdf`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to download report PDF");
        setOperationError(message);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `disaster-report-${selectedDisasterId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading report PDF:", error);
      setOperationError("Failed to download report PDF.");
    }
  };

  const saveAffectedDisplay = async () => {
    if (!selectedDisasterId) return;
    const value = affectedDraft;
    if (!value.trim()) {
      setOperationError("Affected people value cannot be empty.");
      return;
    }
    if (value.length > 50) {
      setOperationError("Affected people value must be 50 characters or fewer.");
      return;
    }

    setAffectedSaving(true);
    setOperationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/disasters/${selectedDisasterId}/update-affected`, {
        method: "PUT",
        headers: buildRoleHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ affected_display: value }),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to update affected people");
        setOperationError(message);
        return;
      }

      const payload = await response.json();
      setOperationNotice("Affected people display updated.");
      setOperationData((prev) =>
        prev
          ? {
              ...prev,
              disaster: payload.disaster || prev.disaster,
            }
          : prev
      );
      await loadDisasters();
      setAffectedModalOpen(false);
    } catch (error) {
      console.error("Error updating affected people:", error);
      setOperationError("Failed to update affected people.");
    } finally {
      setAffectedSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Disaster Operations</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Monitor incidents, assignments, resources, and field progress.
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
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.type}
                onChange={(e) => setNewDisaster({ ...newDisaster, type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.location}
                onChange={(e) => setNewDisaster({ ...newDisaster, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.priority}
                onChange={(e) =>
                  setNewDisaster({ ...newDisaster, priority: e.target.value, severity: e.target.value })
                }
              >
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.status}
                onChange={(e) => setNewDisaster({ ...newDisaster, status: e.target.value })}
              >
                <option value="Created">Created</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Affected People</label>
              <input
                type="text"
                maxLength={50}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.affected_display}
                onChange={(e) => setNewDisaster({ ...newDisaster, affected_display: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.date}
                onChange={(e) => setNewDisaster({ ...newDisaster, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Response Team</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newDisaster.response_team}
                onChange={(e) => setNewDisaster({ ...newDisaster, response_team: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              onClick={async () => {
                if (!requireAuth() || !canManageDisasters) return;
                try {
                  const response = await fetch(`${API_BASE_URL}/disasters`, {
                    method: "POST",
                    headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(newDisaster),
                  });
                  if (!response.ok) {
                    const message = await getApiError(response, "Failed to create disaster");
                    throw new Error(message);
                  }
                  await loadDisasters();
                  setIsCreating(false);
                  setNewDisaster({
                    type: "",
                    location: "",
                    severity: "Moderate",
                    priority: "Moderate",
                    status: "Created",
                    response_team: "",
                    affected_display: "0",
                    date: "",
                  });
                } catch (error) {
                  console.error("Error creating disaster:", error);
                  window.alert(error.message || "Failed to create disaster.");
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
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 w-full md:w-auto">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer w-full"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Created">Created</option>
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
            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(disaster.severity)}`}>
                {disaster.severity} Priority
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{disaster.title}</h3>

            <div className="space-y-2 mt-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-2" />
                {disaster.location}
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2" />
                {disaster.affected_display || "N/A"} Affected
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Activity className="h-4 w-4 mr-2" />
                Status: <span className={`ml-1 font-medium ${getStatusColor(disaster.status)}`}>{disaster.status}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Volunteers: {disaster.assigned_volunteers_count} | Resources: {disaster.allocated_resources_count}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-400">
              <span>Updated {formatDate(disaster.date)}</span>
              <div className="flex items-center gap-3">
                <button
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  onClick={async () => {
                    setSelectedDisasterId(disaster.id);
                    setReportData(null);
                    setAffectedModalOpen(false);
                    setAffectedDraft("");
                    setOperationError("");
                    setOperationNotice("");
                    await loadDisasterOperations(disaster.id);
                  }}
                >
                  Manage Operation
                </button>
                {canManageDisasters && (
                  <button
                    className="text-red-600 dark:text-red-400 font-medium hover:underline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE_URL}/disasters/${disaster.id}`, {
                          method: "DELETE",
                          headers: buildRoleHeaders(),
                        });
                        if (!response.ok) throw new Error("Delete failed");
                        if (selectedDisasterId === disaster.id) {
                          setSelectedDisasterId(null);
                          setOperationData(null);
                        }
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

      {selectedDisasterId && operationData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Operation: {operationData.disaster.type} - {operationData.disaster.location}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connected workflow view for volunteers, resources, progress, and timeline.
              </p>
              <p className="text-xs mt-1">
                Lifecycle Status:{" "}
                <span className={`font-semibold ${getStatusColor(operationData.disaster.status)}`}>
                  {operationData.disaster.status}
                </span>
              </p>
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                Affected People: {operationData.disaster.affected_display || "N/A"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageDisasters && (
                <button
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg"
                  onClick={() => {
                    setAffectedDraft(operationData.disaster.affected_display || "");
                    setAffectedModalOpen(true);
                  }}
                >
                  Update Affected
                </button>
              )}
              {canManageDisasters && getNextLifecycleStatus(operationData.disaster.status) && (
                <button
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg"
                  onClick={moveDisasterToNextStage}
                >
                  Move to {getNextLifecycleStatus(operationData.disaster.status)}
                </button>
              )}
              {canManageDisasters && (
                <>
                  <button
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                    onClick={generateReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? "Generating..." : "Generate Report"}
                  </button>
                  <button
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs rounded-lg"
                    onClick={downloadReportPdf}
                  >
                    Download PDF
                  </button>
                </>
              )}
              <button
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => {
                  setSelectedDisasterId(null);
                  setOperationData(null);
                  setReportData(null);
                  setAffectedModalOpen(false);
                  setAffectedDraft("");
                  setOperationError("");
                  setOperationNotice("");
                }}
              >
                Close
              </button>
            </div>
          </div>

          {operationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
              {operationError}
            </div>
          )}
          {operationNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">
              {operationNotice}
            </div>
          )}

          {affectedModalOpen && canManageDisasters && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-5 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Update Affected People</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Examples: {"< 500"}, {"600+"}, {"> 800"}, {"500-700"}
                  </p>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={affectedDraft}
                  onChange={(e) => setAffectedDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  placeholder="Enter affected people display..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg"
                    onClick={() => {
                      setAffectedModalOpen(false);
                      setAffectedDraft("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg disabled:opacity-60"
                    onClick={saveAffectedDisplay}
                    disabled={affectedSaving}
                  >
                    {affectedSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {operationData.workflow?.alerts?.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Operational Alerts</p>
              <ul className="mt-1 text-xs text-red-700 dark:text-red-300 list-disc pl-4 space-y-1">
                {operationData.workflow.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {operationData.workflow?.suggestions?.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/20">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Workflow Suggestions</p>
              <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 list-disc pl-4 space-y-1">
                {operationData.workflow.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {(reportData || operationData.report_summary) && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/30 dark:bg-indigo-900/20">
              <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Disaster Summary Report</h3>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                <p>Total resources used: {(reportData || operationData.report_summary).total_resources_used}</p>
                <p>Total volunteers assigned: {(reportData || operationData.report_summary).total_volunteers_assigned}</p>
                <p>Total hours logged: {(reportData || operationData.report_summary).total_hours_logged}</p>
                <p>Duration: {(reportData || operationData.report_summary).duration_hours} hours</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium">Assigned Volunteers</div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationData.assigned_volunteers.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No volunteers assigned.</p>
                )}
                {operationData.assigned_volunteers.map((assignment) => (
                  <div key={assignment.id} className="p-4">
                    <p className="font-medium text-sm">{assignment.volunteer_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {assignment.status} | Hours: {assignment.hours_logged}
                    </p>
                    <p className="text-xs text-gray-500">{assignment.task_details || "No task details"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium">Allocated Resources</div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationData.allocated_resources.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No resources allocated.</p>
                )}
                {operationData.allocated_resources.map((allocation) => (
                  <div key={allocation.id} className="p-4">
                    <p className="font-medium text-sm">{allocation.resource_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Qty: {allocation.quantity} | By: {allocation.allocated_by || "Admin"}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(allocation.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium">Progress Updates</div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[320px] overflow-y-auto">
                {operationData.progress_updates.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No updates recorded yet.</p>
                )}
                {operationData.progress_updates.map((update) => (
                  <div key={update.id} className="p-4">
                    <p className="text-sm">{update.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {update.created_by || "Admin"} | {formatDate(update.created_at)}
                    </p>
                  </div>
                ))}
              </div>
              {canManageDisasters && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                    placeholder="Add operation progress update..."
                    value={progressMessage}
                    onChange={(e) => setProgressMessage(e.target.value)}
                  />
                  <button
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                    onClick={async () => {
                      const message = progressMessage.trim();
                      if (!message) return;
                      setOperationError("");
                      try {
                        const response = await fetch(
                          `${API_BASE_URL}/disasters/${selectedDisasterId}/progress`,
                          {
                            method: "POST",
                            headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ message }),
                          }
                        );
                        if (!response.ok) {
                          const errorMessage = await getApiError(response, "Progress update failed");
                          throw new Error(errorMessage);
                        }
                        setProgressMessage("");
                        await loadDisasterOperations(selectedDisasterId);
                      } catch (error) {
                        console.error("Error adding progress update:", error);
                        setOperationError(error.message || "Progress update failed.");
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium">Activity Log Timeline</div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[370px] overflow-y-auto">
                {operationData.activity_logs.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No activity recorded yet.</p>
                )}
                {operationData.activity_logs.map((entry) => (
                  <div key={entry.id} className="p-4">
                    <p className="text-sm font-medium">{entry.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.details || "No additional details"}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {entry.actor_name || "System"} | {formatDate(entry.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredDisasters.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No disasters found matching your criteria.</p>
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
}
