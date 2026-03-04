import { useEffect, useMemo, useState } from "react";
import { Award, ChevronRight, Clock, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRoleHeaders, getUserRole, isAdmin } from "../utils/auth";

const API_BASE_URL = "http://localhost:5000/api";

async function getApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function formatDate(value) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getStatusConfig(status) {
  switch (status) {
    case "Verified":
    case "Completed":
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
      };
    case "Pending":
    case "Assigned":
      return {
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
      };
    default:
      return {
        icon: <UserCheck className="h-4 w-4" />,
        color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
      };
  }
}

function AdminVolunteerView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [volunteers, setVolunteers] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({
    name: "",
    phone: "",
    skills: "",
    verification_status: "Pending",
  });
  const [assignmentDraft, setAssignmentDraft] = useState({
    disaster_id: "",
    task_details: "",
  });
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");

  const requireAuth = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", {
        state: { from: location.pathname, message: "Login required to manage volunteers." },
      });
      return false;
    }
    return true;
  };

  const loadData = async () => {
    try {
      const [volRes, disRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/volunteers`, { headers: buildRoleHeaders() }),
        fetch(`${API_BASE_URL}/disasters`, { headers: buildRoleHeaders() }),
        fetch(`${API_BASE_URL}/assignments`, { headers: buildRoleHeaders() }),
      ]);
      const [volData, disData, assignData] = await Promise.all([
        volRes.ok ? volRes.json() : [],
        disRes.ok ? disRes.json() : [],
        assignRes.ok ? assignRes.json() : [],
      ]);
      setVolunteers(volData);
      setDisasters(disData.filter((item) => item.type !== "General"));
      setAssignments(assignData);
      setAdminError("");
    } catch (error) {
      console.error("Error loading volunteer admin data:", error);
      setVolunteers([]);
      setDisasters([]);
      setAssignments([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVolunteers = volunteers.filter((volunteer) => {
    const skills = volunteer.skills || "";
    return `${volunteer.name} ${skills}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedVolunteerAssignments = useMemo(() => {
    if (!selectedVolunteer) return [];
    return assignments.filter((assignment) => assignment.volunteer_id === selectedVolunteer.id);
  }, [assignments, selectedVolunteer]);

  const pendingVolunteers = volunteers.filter((volunteer) => volunteer.verification_status === "Pending").length;
  const totalHours = volunteers.reduce((sum, volunteer) => sum + (volunteer.hours_logged || 0), 0);
  const selectedDisaster = disasters.find((item) => String(item.id) === String(assignmentDraft.disaster_id));

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Volunteer Network</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Verify volunteers, assign disasters, and monitor assignment progress.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
          onClick={() => {
            if (!requireAuth()) return;
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? "Cancel" : "Invite Volunteer"}
        </button>
      </div>

      {adminError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {adminError}
        </div>
      )}
      {adminNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">
          {adminNotice}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newVolunteer.name}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newVolunteer.phone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Skills</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newVolunteer.skills}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, skills: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Verification Status
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                value={newVolunteer.verification_status}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, verification_status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="Verified">Verified</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              onClick={async () => {
                if (!requireAuth()) return;
                setAdminError("");
                setAdminNotice("");
                try {
                  const response = await fetch(`${API_BASE_URL}/volunteers`, {
                    method: "POST",
                    headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(newVolunteer),
                  });
                  if (!response.ok) {
                    const message = await getApiError(response, "Failed to create volunteer");
                    throw new Error(message);
                  }
                  setShowForm(false);
                  setNewVolunteer({
                    name: "",
                    phone: "",
                    skills: "",
                    verification_status: "Pending",
                  });
                  await loadData();
                  setAdminNotice("Volunteer profile created.");
                } catch (error) {
                  console.error("Error creating volunteer:", error);
                  setAdminError(error.message || "Failed to create volunteer");
                }
              }}
            >
              Save Volunteer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Volunteers</p>
            <p className="text-xl font-bold dark:text-white">{volunteers.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Pending Verification</p>
            <p className="text-xl font-bold dark:text-white">{pendingVolunteers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Hours Logged</p>
            <p className="text-xl font-bold dark:text-white">{totalHours}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <input
          type="text"
          placeholder="Filter by name or skills..."
          className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Volunteer
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredVolunteers.map((volunteer) => {
                const status = getStatusConfig(volunteer.verification_status);
                return (
                  <tr key={volunteer.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{volunteer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{volunteer.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                      {volunteer.skills || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {volunteer.verification_status || "Pending"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {volunteer.verification_status === "Pending" && (
                        <button
                          className="text-xs text-green-600 hover:underline"
                          onClick={async () => {
                            setAdminError("");
                            setAdminNotice("");
                            const response = await fetch(`${API_BASE_URL}/volunteers/${volunteer.id}`, {
                              method: "PATCH",
                              headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                              body: JSON.stringify({ verification_status: "Verified" }),
                            });
                            if (!response.ok) {
                              setAdminError(await getApiError(response, "Failed to verify volunteer"));
                              return;
                            }
                            setAdminNotice("Volunteer verified.");
                            await loadData();
                          }}
                        >
                          Verify
                        </button>
                      )}
                      <button
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                        onClick={() => setSelectedVolunteer(volunteer)}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVolunteer && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Volunteer Assignment Control</h2>
            <button
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setSelectedVolunteer(null)}
            >
              Close
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVolunteer.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedVolunteer.skills || "General"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Verification: {selectedVolunteer.verification_status || "Pending"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={assignmentDraft.disaster_id}
              onChange={(e) => setAssignmentDraft({ ...assignmentDraft, disaster_id: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
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
              type="text"
              value={assignmentDraft.task_details}
              onChange={(e) => setAssignmentDraft({ ...assignmentDraft, task_details: e.target.value })}
              placeholder="Task details"
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            />
            <button
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={
                !assignmentDraft.disaster_id ||
                selectedVolunteer.verification_status !== "Verified" ||
                selectedDisaster?.status === "Closed"
              }
              onClick={async () => {
                if (!assignmentDraft.disaster_id) return;
                setAdminError("");
                setAdminNotice("");
                const response = await fetch(`${API_BASE_URL}/volunteers/${selectedVolunteer.id}/assignments`, {
                  method: "POST",
                  headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({
                    disaster_id: Number(assignmentDraft.disaster_id),
                    task_details: assignmentDraft.task_details,
                  }),
                });
                if (!response.ok) {
                  setAdminError(await getApiError(response, "Failed to assign volunteer"));
                  return;
                }
                setAssignmentDraft({ disaster_id: "", task_details: "" });
                setAdminNotice("Volunteer assignment created.");
                await loadData();
              }}
            >
              Assign Volunteer
            </button>
          </div>

          {selectedVolunteer.verification_status !== "Verified" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Volunteer must be verified before assignment.
            </p>
          )}
          {selectedDisaster?.status === "Closed" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Cannot assign volunteers to a closed disaster.
            </p>
          )}

          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium">
              Current Assignments
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedVolunteerAssignments.length === 0 && (
                <p className="p-3 text-xs text-gray-500">No assignments yet.</p>
              )}
              {selectedVolunteerAssignments.map((assignment) => (
                <div key={assignment.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.disaster_label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {assignment.status} | Hours: {assignment.hours_logged}
                    </p>
                  </div>
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={async () => {
                      const response = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
                        method: "DELETE",
                        headers: buildRoleHeaders(),
                      });
                      if (!response.ok) {
                        setAdminError(await getApiError(response, "Failed to remove assignment"));
                        return;
                      }
                      setAdminNotice("Assignment removed.");
                      await loadData();
                    }}
                  >
                    Remove Assignment
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VolunteerTaskView() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [hoursByAssignment, setHoursByAssignment] = useState({});

  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/volunteers/me`, {
        headers: buildRoleHeaders(),
      });
      if (!response.ok) throw new Error("Failed to load volunteer data");
      const data = await response.json();
      setProfile(data.profile);
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error("Error loading volunteer view:", error);
      setProfile(null);
      setAssignments([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalHours = assignments.reduce((sum, assignment) => sum + (assignment.hours_logged || 0), 0);
  const activeAssignment = assignments.find((assignment) =>
    ["Assigned", "Accepted", "In Progress"].includes(assignment.status)
  );

  return (
    <div className="space-y-6 page-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">My Volunteer Tasks</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          View assigned disasters, respond to tasks, log hours, and mark completion.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Assigned Disaster</p>
          <p className="text-sm font-semibold mt-2 dark:text-white">
            {activeAssignment?.disaster_label || "Not assigned"}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Hours Logged</p>
          <p className="text-sm font-semibold mt-2 dark:text-white">{profile?.hours_logged || totalHours}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Task Status</p>
          <p className="text-sm font-semibold mt-2 dark:text-white">{activeAssignment?.status || "No active task"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Profile</p>
          <p className="text-sm font-semibold mt-2 dark:text-white">{profile?.name || "Volunteer"}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assigned Tasks</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {assignments.length === 0 && <p className="p-4 text-sm text-gray-500">No assignments yet.</p>}
          {assignments.map((assignment) => {
            const status = getStatusConfig(assignment.status);
            return (
              <div key={assignment.id} className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.disaster_label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Task: {assignment.task_details || "General field support"}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.icon}
                    {assignment.status}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hours: {assignment.hours_logged} | Assigned: {formatDate(assignment.assigned_at)}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {assignment.status === "Assigned" && (
                    <>
                      <button
                        className="px-3 py-1.5 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          await fetch(`${API_BASE_URL}/assignments/${assignment.id}/respond`, {
                            method: "POST",
                            headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ action: "accept" }),
                          });
                          await loadData();
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-md bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={async () => {
                          await fetch(`${API_BASE_URL}/assignments/${assignment.id}/respond`, {
                            method: "POST",
                            headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ action: "reject" }),
                          });
                          await loadData();
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {["Accepted", "In Progress"].includes(assignment.status) && (
                    <>
                      <input
                        type="number"
                        min={1}
                        placeholder="Hours"
                        value={hoursByAssignment[assignment.id] || ""}
                        onChange={(e) =>
                          setHoursByAssignment({ ...hoursByAssignment, [assignment.id]: e.target.value })
                        }
                        className="w-24 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                      />
                      <button
                        className="px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={async () => {
                          const hours = Number(hoursByAssignment[assignment.id] || 0);
                          if (!hours) return;
                          await fetch(`${API_BASE_URL}/assignments/${assignment.id}/hours`, {
                            method: "POST",
                            headers: buildRoleHeaders({ "Content-Type": "application/json" }),
                            body: JSON.stringify({ hours }),
                          });
                          setHoursByAssignment({ ...hoursByAssignment, [assignment.id]: "" });
                          await loadData();
                        }}
                      >
                        Log Hours
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={async () => {
                          await fetch(`${API_BASE_URL}/assignments/${assignment.id}/complete`, {
                            method: "POST",
                            headers: buildRoleHeaders(),
                          });
                          await loadData();
                        }}
                      >
                        Mark Completed
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Volunteers() {
  const role = getUserRole();
  if (role === "admin" && isAdmin()) {
    return <AdminVolunteerView />;
  }
  return <VolunteerTaskView />;
}
