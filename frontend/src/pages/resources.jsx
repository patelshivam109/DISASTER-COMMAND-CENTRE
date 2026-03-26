import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Package, Search, Truck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRoleHeaders, isAdmin } from "../utils/auth";
import { API_BASE_URL } from "../api/config";

async function getApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

const getStockBadgeColor = (stockLevel) => {
  if (stockLevel === "Exhausted") {
    return "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
  if (stockLevel === "Critical") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  if (stockLevel === "Low") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
};

const getStockBarColor = (stockLevel) => {
  if (stockLevel === "Exhausted") return "bg-red-600";
  if (stockLevel === "Critical") return "bg-red-500";
  if (stockLevel === "Low") return "bg-orange-500";
  return "bg-green-500";
};

function formatDate(value) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function Resources() {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageResources = isAdmin();

  const [activeTab, setActiveTab] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [allocationFormFor, setAllocationFormFor] = useState(null);
  const [resourceError, setResourceError] = useState("");
  const [resourceNotice, setResourceNotice] = useState("");

  const [newResource, setNewResource] = useState({
    name: "",
    category: "General",
    quantity: "",
    location: "",
    warehouse_info: "",
    low_threshold: 50,
    critical_threshold: 20,
  });

  const [allocationDraft, setAllocationDraft] = useState({
    disaster_id: "",
    quantity: "",
    notes: "",
  });

  const requireAuth = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: "Login required for resource operations.",
        },
      });
      return false;
    }
    return true;
  };

  const loadResources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resources`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch resources");
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error loading resources:", error);
      setInventory([]);
    }
  };

  const loadDisasters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/disasters`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch disasters");
      const data = await response.json();
      setDisasters(data.filter((item) => item.type !== "General"));
    } catch (error) {
      console.error("Error loading disasters:", error);
      setDisasters([]);
    }
  };

  const loadAllocationHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resources/allocations`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch allocation history");
      setAllocationHistory(await response.json());
    } catch (error) {
      console.error("Error loading allocation history:", error);
      setAllocationHistory([]);
    }
  };

  useEffect(() => {
    loadResources();
    loadDisasters();
    loadAllocationHistory();
  }, []);

  const filteredInventory = inventory.filter((resource) =>
    `${resource.name} ${resource.category} ${resource.location || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const exhaustedResources = inventory.filter((resource) => (resource.quantity || 0) <= 0);

  const handleSaveResource = async () => {
    if (!requireAuth() || !canManageResources) return;
    setResourceError("");
    setResourceNotice("");
    try {
      const payload = {
        ...newResource,
        quantity: Number(newResource.quantity),
        low_threshold: Number(newResource.low_threshold),
        critical_threshold: Number(newResource.critical_threshold),
      };
      const response = await fetch(`${API_BASE_URL}/resources`, {
        method: "POST",
        headers: buildRoleHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to create resource");
        throw new Error(message);
      }
      setShowResourceForm(false);
      setNewResource({
        name: "",
        category: "General",
        quantity: "",
        location: "",
        warehouse_info: "",
        low_threshold: 50,
        critical_threshold: 20,
      });
      await loadResources();
      await loadAllocationHistory();
      setResourceNotice("Resource created successfully.");
    } catch (error) {
      console.error("Error creating resource:", error);
      setResourceError(error.message || "Failed to create resource.");
    }
  };

  const handleAllocateResource = async (resourceId) => {
    if (!requireAuth() || !canManageResources) return;
    setResourceError("");
    setResourceNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/allocate`, {
        method: "POST",
        headers: buildRoleHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          disaster_id: Number(allocationDraft.disaster_id),
          quantity: Number(allocationDraft.quantity),
          notes: allocationDraft.notes,
        }),
      });
      if (!response.ok) {
        const message = await getApiError(response, "Failed to allocate resource");
        throw new Error(message);
      }
      const payload = await response.json();
      setAllocationFormFor(null);
      setAllocationDraft({ disaster_id: "", quantity: "", notes: "" });
      await loadResources();
      await loadAllocationHistory();
      setResourceNotice(payload.alert || "Resource allocated successfully.");
    } catch (error) {
      console.error("Error allocating resource:", error);
      setResourceError(error.message || "Failed to allocate resource.");
    }
  };

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Resource Allocation</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage stock, allocate to disasters, and track allocation history.
          </p>
        </div>
        {canManageResources && (
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
            onClick={() => {
              if (!requireAuth()) return;
              setShowResourceForm((prev) => !prev);
            }}
          >
            {showResourceForm ? "Cancel" : "+ Add Resource"}
          </button>
        )}
      </div>

      {resourceError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {resourceError}
        </div>
      )}
      {resourceNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">
          {resourceNotice}
        </div>
      )}
      {exhaustedResources.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          Resource exhaustion detected: {exhaustedResources.map((resource) => resource.name).join(", ")}.
        </div>
      )}

      {showResourceForm && canManageResources && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.category}
                onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.quantity}
                onChange={(e) => setNewResource({ ...newResource, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.location}
                onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse Info</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.warehouse_info}
                onChange={(e) => setNewResource({ ...newResource, warehouse_info: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Low Threshold</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.low_threshold}
                onChange={(e) => setNewResource({ ...newResource, low_threshold: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Critical Threshold
              </label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newResource.critical_threshold}
                onChange={(e) => setNewResource({ ...newResource, critical_threshold: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
              onClick={() => setShowResourceForm(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              onClick={handleSaveResource}
            >
              Save Resource
            </button>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`py-3 border-b-2 text-sm font-medium cursor-pointer ${
              activeTab === "inventory"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Inventory Stock
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 border-b-2 text-sm font-medium cursor-pointer ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Allocation History
          </button>
        </nav>
      </div>

      <div className="flex items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <Search className="h-4 w-4 text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ml-3 flex-1 bg-transparent text-sm focus:outline-none text-gray-700 dark:text-gray-200"
        />
      </div>

      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInventory.map((item) => {
            const estimatedCapacity = Math.max(item.low_threshold * 3, item.quantity || 1);
            const percentage = Math.min(100, ((item.quantity || 0) / estimatedCapacity) * 100);
            const stockLevel = (item.quantity || 0) <= 0 ? "Exhausted" : item.stock_level;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.category || "General"}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStockBadgeColor(stockLevel)}`}>
                    {stockLevel}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Available</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStockBarColor(stockLevel)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {item.location || "Unknown location"}
                  </div>
                  <p>Warehouse: {item.warehouse_info || "Not set"}</p>
                  <p>
                    Thresholds: Low {item.low_threshold} | Critical {item.critical_threshold}
                  </p>
                </div>

                {canManageResources && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                      onClick={() => {
                        setAllocationFormFor((prev) => (prev === item.id ? null : item.id));
                        setAllocationDraft({ disaster_id: "", quantity: "", notes: "" });
                      }}
                    >
                      {allocationFormFor === item.id ? "Close Allocation" : "Allocate to Disaster"}
                    </button>

                    {allocationFormFor === item.id && (
                      <div className="mt-3 space-y-2">
                        <select
                          value={allocationDraft.disaster_id}
                          onChange={(e) => setAllocationDraft({ ...allocationDraft, disaster_id: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                        >
                          <option value="">Select disaster</option>
                          {disasters.map((disaster) => (
                            <option key={disaster.id} value={disaster.id} disabled={disaster.status === "Closed"}>
                              {disaster.type} - {disaster.location}
                              {disaster.status === "Closed" ? " (Closed)" : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={allocationDraft.quantity}
                          onChange={(e) => setAllocationDraft({ ...allocationDraft, quantity: e.target.value })}
                          placeholder="Quantity"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                        />
                        <input
                          type="text"
                          value={allocationDraft.notes}
                          onChange={(e) => setAllocationDraft({ ...allocationDraft, notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                        />
                        <button
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={!allocationDraft.disaster_id || (item.quantity || 0) <= 0}
                          onClick={() => handleAllocateResource(item.id)}
                        >
                          Confirm Allocation
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredInventory.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500">
              No resources found.
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Resource Allocation History</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {allocationHistory.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No allocations recorded.</p>
            )}
            {allocationHistory.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {entry.resource_name} {"->"} {entry.disaster_label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Qty: {entry.quantity} | By: {entry.allocated_by || "Admin"}
                  </p>
                  {entry.notes && <p className="text-xs text-gray-500 dark:text-gray-400">Note: {entry.notes}</p>}
                </div>
                <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Resources</p>
            <p className="text-lg font-bold dark:text-white">{inventory.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Low Stock</p>
            <p className="text-lg font-bold dark:text-white">
              {inventory.filter((item) => item.stock_level === "Low").length}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Critical Stock</p>
            <p className="text-lg font-bold dark:text-white">
              {inventory.filter((item) => item.stock_level === "Critical").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
