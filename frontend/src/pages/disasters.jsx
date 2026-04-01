import { Suspense, lazy, useDeferredValue, useEffect, useState } from "react";
import { Activity, AlertTriangle, Filter, MapPin, Search, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/config";
import { buildRoleHeaders, isAdmin } from "../utils/auth";
import { MapPanelSkeleton, Skeleton } from "../ui/skeleton";

const DisasterMap = lazy(() => import("../components/DisasterMap"));

const LIFECYCLE = ["Created", "Active", "Recovering", "Closed"];

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapDisasterForView(item) {
  return {
    id: item.id,
    title: `${item.type} - ${item.location}`,
    location: item.location,
    latitude: parseCoordinate(item.latitude),
    longitude: parseCoordinate(item.longitude),
    severity: item.severity || item.priority || "Moderate",
    priority: item.priority || item.severity || "Moderate",
    status: item.status || "Active",
    affected_display: item.affected_display || "0",
    type: item.type,
    date: item.date || item.created_at || "Just now",
    assigned_volunteers_count: item.assigned_volunteers_count || 0,
    allocated_resources_count: item.allocated_resources_count || 0,
  };
}

const getSeverityColor = (severity) => {
  const level = (severity || "").toLowerCase();
  if (level === "critical" || level === "high") {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  }
  if (level === "moderate" || level === "medium") {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
  }
  if (level === "low") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
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

function IncidentCardSkeleton() {
  return (
    <div className="panel-surface rounded-[26px] p-5">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-11 w-11 rounded-[18px]" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-7 w-48 rounded-2xl" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-4 w-36 rounded-full" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function Disasters() {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageDisasters = isAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [disasters, setDisasters] = useState([]);
  const [isLoadingDisasters, setIsLoadingDisasters] = useState(true);
  const [loadError, setLoadError] = useState("");
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
    latitude: "",
    longitude: "",
    severity: "Moderate",
    priority: "Moderate",
    status: "Created",
    response_team: "",
    affected_display: "0",
    date: "",
  });
  const deferredSearchTerm = useDeferredValue(searchTerm);

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

  const loadDisasters = async (signal) => {
    setIsLoadingDisasters(true);
    setLoadError("");

    try {
      const response = await fetch(`${API_BASE_URL}/disasters`, {
        headers: buildRoleHeaders(),
        signal,
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to fetch disasters");
        throw new Error(message);
      }

      const data = await response.json();
      const mapped = data.filter((item) => item.type !== "General").map(mapDisasterForView);
      setDisasters(mapped);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      console.error("Error fetching disasters:", error);
      setDisasters([]);
      setLoadError(error.message || "Failed to load disaster data.");
    } finally {
      setIsLoadingDisasters(false);
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
      setOperationError("Failed to load operation details.");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDisasters(controller.signal);
    return () => controller.abort();
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
      item.title.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(deferredSearchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const mappedDisasterCount = filteredDisasters.filter(
    (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
  ).length;

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Disaster Operations</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor incidents, assignments, resources, field progress, and live disaster locations.
          </p>
        </div>
        <button
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          onClick={() => {
            if (!requireAuth()) return;
            if (!canManageDisasters) return;
            setIsCreating((prev) => !prev);
          }}
        >
          {canManageDisasters ? (isCreating ? "Cancel" : "+ Report New Incident") : "View Incidents"}
        </button>
      </div>

      {isCreating ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.type}
                onChange={(event) => setNewDisaster({ ...newDisaster, type: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Location</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.location}
                onChange={(event) => setNewDisaster({ ...newDisaster, location: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Latitude</label>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.latitude}
                onChange={(event) => setNewDisaster({ ...newDisaster, latitude: event.target.value })}
                placeholder="19.0760"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Longitude</label>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.longitude}
                onChange={(event) => setNewDisaster({ ...newDisaster, longitude: event.target.value })}
                placeholder="72.8777"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.priority}
                onChange={(event) =>
                  setNewDisaster({ ...newDisaster, priority: event.target.value, severity: event.target.value })
                }
              >
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Affected People
              </label>
              <input
                type="text"
                maxLength={50}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.affected_display}
                onChange={(event) => setNewDisaster({ ...newDisaster, affected_display: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.date}
                onChange={(event) => setNewDisaster({ ...newDisaster, date: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Response Team
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={newDisaster.response_team}
                onChange={(event) => setNewDisaster({ ...newDisaster, response_team: event.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={async () => {
                if (!requireAuth() || !canManageDisasters) return;

                if (!newDisaster.latitude.trim() || !newDisaster.longitude.trim()) {
                  window.alert("Latitude and longitude are required to plot the disaster on the map.");
                  return;
                }

                try {
                  const payload = {
                    ...newDisaster,
                    latitude: Number(newDisaster.latitude),
                    longitude: Number(newDisaster.longitude),
                  };

                  const response = await fetch(`${API_BASE_URL}/disasters`, {
                    method: "POST",
                    headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload),
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
                    latitude: "",
                    longitude: "",
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
      ) : null}

      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm dark:border-gray-600 dark:bg-gray-700"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 md:w-auto">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              className="w-full cursor-pointer bg-transparent text-sm text-gray-700 focus:outline-none dark:text-gray-200"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
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

      <Suspense fallback={<MapPanelSkeleton />}>
        <DisasterMap disasters={filteredDisasters} error={loadError} isLoading={isLoadingDisasters} />
      </Suspense>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{filteredDisasters.length} incidents match the current filters.</span>
        <span>{mappedDisasterCount} incidents have usable map coordinates.</span>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoadingDisasters
          ? Array.from({ length: 6 }).map((_, index) => <IncidentCardSkeleton key={`incident-skeleton-${index}`} />)
          : null}
        {filteredDisasters.map((disaster) => (
          <div
            key={disaster.id}
            className="panel-surface group rounded-[26px] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="metric-orb rounded-[18px] text-[var(--accent-primary)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getSeverityColor(disaster.severity)}`}>
                {disaster.severity} Priority
              </span>
            </div>

            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{disaster.title}</h3>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="mr-2 h-4 w-4" />
                {disaster.location}
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Users className="mr-2 h-4 w-4" />
                {disaster.affected_display || "N/A"} Affected
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Activity className="mr-2 h-4 w-4" />
                Status: <span className={`ml-1 font-medium ${getStatusColor(disaster.status)}`}>{disaster.status}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Volunteers: {disaster.assigned_volunteers_count} | Resources: {disaster.allocated_resources_count}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Coordinates:{" "}
                {Number.isFinite(disaster.latitude) && Number.isFinite(disaster.longitude)
                  ? `${disaster.latitude.toFixed(4)}, ${disaster.longitude.toFixed(4)}`
                  : "Not available"}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-700">
              <span>Updated {formatDate(disaster.date)}</span>
              <div className="flex items-center gap-3">
                <button
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
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
                {canManageDisasters ? (
                  <button
                    className="font-medium text-red-600 hover:underline dark:text-red-400"
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
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedDisasterId && operationData ? (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Operation: {operationData.disaster.type} - {operationData.disaster.location}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connected workflow view for volunteers, resources, progress, and timeline.
              </p>
              <p className="mt-1 text-xs">
                Lifecycle Status:{" "}
                <span className={`font-semibold ${getStatusColor(operationData.disaster.status)}`}>
                  {operationData.disaster.status}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Affected People: {operationData.disaster.affected_display || "N/A"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Coordinates:{" "}
                {Number.isFinite(parseCoordinate(operationData.disaster.latitude)) &&
                Number.isFinite(parseCoordinate(operationData.disaster.longitude))
                  ? `${parseCoordinate(operationData.disaster.latitude).toFixed(4)}, ${parseCoordinate(
                      operationData.disaster.longitude
                    ).toFixed(4)}`
                  : "Not available"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageDisasters ? (
                <button
                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs text-white hover:bg-amber-700"
                  onClick={() => {
                    setAffectedDraft(operationData.disaster.affected_display || "");
                    setAffectedModalOpen(true);
                  }}
                >
                  Update Affected
                </button>
              ) : null}
              {canManageDisasters && getNextLifecycleStatus(operationData.disaster.status) ? (
                <button
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700"
                  onClick={moveDisasterToNextStage}
                >
                  Move to {getNextLifecycleStatus(operationData.disaster.status)}
                </button>
              ) : null}
              {canManageDisasters ? (
                <>
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
                    onClick={generateReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? "Generating..." : "Generate Report"}
                  </button>
                  <button
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800"
                    onClick={downloadReportPdf}
                  >
                    Download PDF
                  </button>
                </>
              ) : null}
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

          {operationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
              {operationError}
            </div>
          ) : null}
          {operationNotice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">
              {operationNotice}
            </div>
          ) : null}

          {affectedModalOpen && canManageDisasters ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Update Affected People</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Examples: {"< 500"}, {"600+"}, {"> 800"}, {"500-700"}
                  </p>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={affectedDraft}
                  onChange={(event) => setAffectedDraft(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Enter affected people display..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    onClick={() => {
                      setAffectedModalOpen(false);
                      setAffectedDraft("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60 hover:bg-amber-700"
                    onClick={saveAffectedDisplay}
                    disabled={affectedSaving}
                  >
                    {affectedSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {operationData.workflow?.alerts?.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Operational Alerts</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-red-700 dark:text-red-300">
                {operationData.workflow.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {operationData.workflow?.suggestions?.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/20">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Workflow Suggestions</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-700 dark:text-amber-300">
                {operationData.workflow.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {reportData || operationData.report_summary ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/30 dark:bg-indigo-900/20">
              <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Disaster Summary Report</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-indigo-700 dark:text-indigo-300 md:grid-cols-2">
                <p>Total resources used: {(reportData || operationData.report_summary).total_resources_used}</p>
                <p>
                  Total volunteers assigned: {(reportData || operationData.report_summary).total_volunteers_assigned}
                </p>
                <p>Total hours logged: {(reportData || operationData.report_summary).total_hours_logged}</p>
                <p>Duration: {(reportData || operationData.report_summary).duration_hours} hours</p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 font-medium dark:border-gray-700">
                Assigned Volunteers
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationData.assigned_volunteers.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No volunteers assigned.</p>
                ) : null}
                {operationData.assigned_volunteers.map((assignment) => (
                  <div key={assignment.id} className="p-4">
                    <p className="text-sm font-medium">{assignment.volunteer_name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {assignment.status} | Hours: {assignment.hours_logged}
                    </p>
                    <p className="text-xs text-gray-500">{assignment.task_details || "No task details"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 font-medium dark:border-gray-700">
                Allocated Resources
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationData.allocated_resources.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No resources allocated.</p>
                ) : null}
                {operationData.allocated_resources.map((allocation) => (
                  <div key={allocation.id} className="p-4">
                    <p className="text-sm font-medium">{allocation.resource_name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Qty: {allocation.quantity} | By: {allocation.allocated_by || "Admin"}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(allocation.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 font-medium dark:border-gray-700">Progress Updates</div>
              <div className="max-h-[320px] divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
                {operationData.progress_updates.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No updates recorded yet.</p>
                ) : null}
                {operationData.progress_updates.map((update) => (
                  <div key={update.id} className="p-4">
                    <p className="text-sm">{update.message}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {update.created_by || "Admin"} | {formatDate(update.created_at)}
                    </p>
                  </div>
                ))}
              </div>
              {canManageDisasters ? (
                <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Add operation progress update..."
                    value={progressMessage}
                    onChange={(event) => setProgressMessage(event.target.value)}
                  />
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    onClick={async () => {
                      const message = progressMessage.trim();
                      if (!message) return;
                      setOperationError("");
                      try {
                        const response = await fetch(`${API_BASE_URL}/disasters/${selectedDisasterId}/progress`, {
                          method: "POST",
                          headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                          body: JSON.stringify({ message }),
                        });
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
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 font-medium dark:border-gray-700">
                Activity Log Timeline
              </div>
              <div className="max-h-[370px] divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
                {operationData.activity_logs.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No activity recorded yet.</p>
                ) : null}
                {operationData.activity_logs.map((entry) => (
                  <div key={entry.id} className="p-4">
                    <p className="text-sm font-medium">{entry.action}</p>
                    <p className="mt-1 text-xs text-gray-500">{entry.details || "No additional details"}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {entry.actor_name || "System"} | {formatDate(entry.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoadingDisasters && filteredDisasters.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-gray-500 dark:text-gray-400">No disasters found matching your criteria.</p>
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
      ) : null}
    </div>
  );
}
