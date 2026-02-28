import React, { useState, useEffect } from 'react';
import {
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Filter, 
  Search, 
  Award,
  ChevronRight,
  Users
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildRoleHeaders, isAdmin } from '../utils/auth';

// --- MOCK DATA: VOLUNTEERS ---
const VOLUNTEER_DATA = [
  { 
    id: 1, 
    name: "Arjun Mehta", 
    email: "arjun.m@example.com", 
    skills: ["First Aid", "Driving"], 
    status: "Verified", 
    joined: "Jan 12, 2026",
    hours: 48
  },
  { 
    id: 2, 
    name: "Sarah Jenkins", 
    email: "s.jenkins@test.com", 
    skills: ["Translation", "Logistics"], 
    status: "Pending", 
    joined: "Jan 20, 2026",
    hours: 0
  },
  { 
    id: 3, 
    name: "Michael Kwok", 
    email: "m.kwok@service.org", 
    skills: ["Medical", "Heavy Lifting"], 
    status: "Verified", 
    joined: "Dec 05, 2025",
    hours: 124
  },
  { 
    id: 4, 
    name: "Elena Rodriguez", 
    email: "elena.rod@webmail.com", 
    skills: ["Counseling", "Social Media"], 
    status: "Under Review", 
    joined: "Jan 22, 2026",
    hours: 0
  }
];

const API_BASE_URL = "http://localhost:5000/api";

const Volunteers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageVolunteers = isAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [volunteers, setVolunteers] = useState(VOLUNTEER_DATA);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({
    name: '',
    email: '',
    phone: '',
    skills: '',
    availability: 'Verified',
    disaster_id: ''
  });

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/volunteers`);
        if (!response.ok) throw new Error("Failed to fetch volunteers");
        const data = await response.json();

        const mappedVolunteers = data.map((item, index) => ({
          id: item.id ?? index + 1,
          name: item.name,
          email: "unknown@example.com",
          skills: item.skills ? item.skills.split(',').map(s => s.trim()) : ["General"],
          status: item.availability || "Verified",
          joined: "Recently",
          hours: 0,
        }));

        setVolunteers(mappedVolunteers);
      } catch (error) {
        console.error("Error fetching volunteers from backend, using mock data:", error);
        setVolunteers(VOLUNTEER_DATA);
      }
    };

    fetchVolunteers();
  }, []);

  // Helper for Status UI
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Verified': 
        return { icon: <ShieldCheck className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' };
      case 'Under Review': 
        return { icon: <Clock className="h-4 w-4" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' };
      default: 
        return { icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' };
    }
  };

  const filteredVolunteers = volunteers.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalVolunteers = volunteers.length;
  const pendingVolunteers = volunteers.filter(v => 
    v.status === 'Pending' || v.status === 'Under Review'
  ).length;
  const totalHours = volunteers.reduce((sum, v) => sum + (v.hours || 0), 0);

  return (
    <div className="space-y-6 page-fade-in">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Volunteer Network
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage your workforce and verify incoming applications.
          </p>
        </div>
        {canManageVolunteers && (
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all transform hover:scale-[1.02] cursor-pointer"
            onClick={() => {
              const storedUser = localStorage.getItem("user");
              if (!storedUser) {
                navigate("/login", {
                  state: {
                    from: location.pathname,
                    message: "Login required to invite or edit volunteers.",
                  },
                });
                return;
              }
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? 'Cancel' : 'Invite Volunteers'}
          </button>
        )}
      </div>

      {showForm && canManageVolunteers && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.name}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.email}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.phone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Disaster ID</label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.disaster_id}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, disaster_id: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Skills (comma separated)</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.skills}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, skills: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Availability</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newVolunteer.availability}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, availability: e.target.value })}
              >
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm cursor-pointer"
              onClick={async () => {
                const storedUser = localStorage.getItem("user");
                if (!storedUser) {
                  navigate("/login", {
                    state: {
                      from: location.pathname,
                      message: "Login required to save volunteer details.",
                    },
                  });
                  return;
                }
                try {
                  const payload = {
                    name: newVolunteer.name,
                    phone: newVolunteer.phone,
                    skills: newVolunteer.skills,
                    availability: newVolunteer.availability,
                    disaster_id: Number(newVolunteer.disaster_id),
                  };
                  const response = await fetch(`${API_BASE_URL}/volunteers`, {
                    method: 'POST',
                    headers: buildRoleHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload),
                  });
                  if (!response.ok) throw new Error('Failed to create volunteer');
                  const res = await fetch(`${API_BASE_URL}/volunteers`);
                  if (res.ok) {
                    const data = await res.json();
                    const mappedVolunteers = data.map((item, index) => ({
                      id: item.id ?? index + 1,
                      name: item.name,
                      email: newVolunteer.email || 'unknown@example.com',
                      skills: item.skills ? item.skills.split(',').map(s => s.trim()) : ['General'],
                      status: item.availability || 'Verified',
                      joined: 'Recently',
                      hours: 0,
                    }));
                    setVolunteers(mappedVolunteers);
                  }
                  setShowForm(false);
                  setNewVolunteer({ name: '', email: '', phone: '', skills: '', availability: 'Verified', disaster_id: '' });
                } catch (error) {
                  console.error('Error creating volunteer:', error);
                }
              }}
            >
              Save Volunteer
            </button>
          </div>
        </div>
      )}

      {/* --- Stat Overview Snippets --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Active</p>
            <p className="text-xl font-bold dark:text-white">{totalVolunteers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Applications</p>
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

      {/* --- Search & Filter --- */}
      <div className="flex bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Filter by name or skills (e.g. 'First Aid')..."
            className="w-full pl-10 pr-4 py-2 bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Volunteer List --- */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volunteer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Skills & Expertise</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredVolunteers.map((v) => {
                const status = getStatusConfig(v.status);
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200">
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{v.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{v.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {v.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded font-medium border border-gray-200 dark:border-gray-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {v.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                        onClick={() => setSelectedVolunteer(v)}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Volunteer Details</h2>
            <button
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setSelectedVolunteer(null)}
            >
              Close
            </button>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{selectedVolunteer.name}</p>
          {selectedVolunteer.email && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedVolunteer.email}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedVolunteer.skills.map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded font-medium border border-gray-200 dark:border-gray-600">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Volunteers;
