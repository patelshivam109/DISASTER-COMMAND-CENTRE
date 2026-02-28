import React, { useState, useEffect } from 'react';
import {
  Package, 
  Users, 
  Search, 
  Truck, 
  AlertCircle, 
  CheckCircle, 
  MoreVertical,
  MapPin,
  Phone
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildRoleHeaders, isAdmin } from '../utils/auth';

// --- MOCK DATA: INVENTORY ---
const INVENTORY_DATA = [
  { id: 1, name: "Potable Water", category: "Essentials", quantity: 450, capacity: 1000, location: "Warehouse A", status: "Adequate" },
  { id: 2, name: "MRE Food Packs", category: "Food", quantity: 120, capacity: 2000, location: "Warehouse B", status: "Low Stock" },
  { id: 3, name: "Thermal Blankets", category: "Shelter", quantity: 850, capacity: 1000, location: "Mobile Unit 4", status: "Adequate" },
  { id: 4, name: "First Aid Kits", category: "Medical", quantity: 50, capacity: 500, location: "Central Hub", status: "Critical" },
  { id: 5, name: "Portable Generators", category: "Power", quantity: 12, capacity: 20, location: "Warehouse A", status: "Adequate" },
];

// --- MOCK DATA: PERSONNEL ---
const PERSONNEL_DATA = [
  { id: 1, name: "Dr. Sarah Chen", role: "Medical Lead", team: "Alpha Squad", status: "Deployed", location: "Kerala Sector 4" },
  { id: 2, name: "Mark Russo", role: "Logistics Driver", team: "Transport Unit", status: "Available", location: "Base Camp" },
  { id: 3, name: "Rescue Team Beta", role: "Search & Rescue", team: "Beta Squad", status: "Deployed", location: "Mumbai Field" },
  { id: 4, name: "Priya Patel", role: "Coordinator", team: "Ops Center", status: "Busy", location: "HQ" },
];

const API_BASE_URL = "http://localhost:5000/api";

const Resources = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canManageResources = isAdmin();
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState(INVENTORY_DATA);
  const [personnel, setPersonnel] = useState(PERSONNEL_DATA);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    quantity: '',
    location: '',
    status: 'Available',
    disaster_id: ''
  });

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/resources`);
        if (!response.ok) throw new Error("Failed to fetch resources");
        const data = await response.json();

        const mappedInventory = data.map((item, index) => ({
          id: item.id ?? index + 1,
          name: item.name,
          category: "General",
          quantity: item.quantity,
          capacity: item.quantity * 2 || 100,
          location: item.location || "Unknown",
          status: item.status || "Adequate",
        }));

        setInventory(mappedInventory);
      } catch (error) {
        console.error("Error fetching resources from backend, using mock data:", error);
        setInventory(INVENTORY_DATA);
      }
    };

    const fetchVolunteers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/volunteers`);
        if (!response.ok) throw new Error("Failed to fetch volunteers");
        const data = await response.json();

        const mappedPersonnel = data.map((item, index) => ({
          id: item.id ?? index + 1,
          name: item.name,
          role: item.skills || "Responder",
          team: "Disaster Team",
          status: item.availability || "Available",
          location: "Field",
        }));

        setPersonnel(mappedPersonnel);
      } catch (error) {
        console.error("Error fetching volunteers from backend, using mock data:", error);
        setPersonnel(PERSONNEL_DATA);
      }
    };

    fetchResources();
    fetchVolunteers();
  }, []);

  const handleExportReport = () => {
    if (!canManageResources) return;
    if (!inventory.length) return;
    const headers = ["Name", "Category", "Quantity", "Capacity", "Location", "Status"];
    const rows = inventory.map((item) => [
      item.name,
      item.category,
      item.quantity,
      item.capacity,
      item.location,
      item.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resources-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestock = (id) => {
    if (!canManageResources) return;
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", {
        state: {
          from: location.pathname,
          message: "Login required to restock or add resources.",
        },
      });
      return;
    }

    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 10 } : item
      )
    );
  };

  // Helper: Percentage for progress bars
  const getPercentage = (current, max) => Math.min(100, (current / max) * 100);

  // Helper: Status Colors
  const getStockColor = (status) => {
    if (status === 'Critical') return 'bg-red-500';
    if (status === 'Low Stock') return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getBadgeColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Deployed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 page-fade-in">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Resource Allocation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage inventory levels and personnel deployment.
          </p>
        </div>
        <div className="flex gap-3">
          {canManageResources && (
            <>
              <button 
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={handleExportReport}
              >
                Export Report
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                onClick={() => {
                  const storedUser = localStorage.getItem("user");
                  if (!storedUser) {
                    navigate("/login", {
                      state: {
                        from: location.pathname,
                        message: "Login required to add new resources.",
                      },
                    });
                    return;
                  }
                  setShowResourceForm((prev) => !prev);
                }}
              >
                {showResourceForm ? 'Cancel' : '+ Add Resource'}
              </button>
            </>
          )}
        </div>
      </div>

      {showResourceForm && canManageResources && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newResource.quantity}
                onChange={(e) => setNewResource({ ...newResource, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newResource.location}
                onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newResource.status}
                onChange={(e) => setNewResource({ ...newResource, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Disaster ID</label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newResource.disaster_id}
                onChange={(e) => setNewResource({ ...newResource, disaster_id: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => setShowResourceForm(false)}
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
                      message: "Login required to save resource changes.",
                    },
                  });
                  return;
                }
                try {
                  const payload = {
                    name: newResource.name,
                    quantity: Number(newResource.quantity),
                    location: newResource.location,
                    status: newResource.status,
                    disaster_id: Number(newResource.disaster_id),
                  };
                  const response = await fetch(`${API_BASE_URL}/resources`, {
                    method: 'POST',
                    headers: buildRoleHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload),
                  });
                  if (!response.ok) throw new Error('Failed to create resource');
                  // Refresh inventory list
                  const res = await fetch(`${API_BASE_URL}/resources`);
                  if (res.ok) {
                    const data = await res.json();
                    const mappedInventory = data.map((item, index) => ({
                      id: item.id ?? index + 1,
                      name: item.name,
                      category: 'General',
                      quantity: item.quantity,
                      capacity: item.quantity * 2 || 100,
                      location: item.location || 'Unknown',
                      status: item.status || 'Adequate',
                    }));
                    setInventory(mappedInventory);
                  }
                  setShowResourceForm(false);
                  setNewResource({ name: '', quantity: '', location: '', status: 'Available', disaster_id: '' });
                } catch (error) {
                  console.error('Error creating resource:', error);
                }
              }}
            >
              Save Resource
            </button>
          </div>
        </div>
      )}

      {/* --- Tab Switcher --- */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer
              ${activeTab === 'inventory' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
          >
            <Package className="h-4 w-4" />
            Inventory Stock
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer
              ${activeTab === 'personnel' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
          >
            <Users className="h-4 w-4" />
            Personnel & Teams
          </button>
        </nav>
      </div>

      {/* --- Controls Bar --- */}
      <div className="flex items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <Search className="h-4 w-4 text-gray-400 ml-2" />
        <input 
          type="text" 
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ml-3 flex-1 bg-transparent text-sm focus:outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
      </div>

      {/* --- CONTENT AREA --- */}

      {/* 1. Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getBadgeColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Available</span>
                  <span className="font-medium text-gray-900 dark:text-white">{item.quantity} / {item.capacity}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getStockColor(item.status)}`} 
                    style={{ width: `${getPercentage(item.quantity, item.capacity)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </div>
                {canManageResources && (
                  <button 
                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                    onClick={() => handleRestock(item.id)}
                  >
                    Restock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Personnel Tab Content */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          {personnel.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((person) => (
            <div key={person.id} className="group flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all">
              
              <div className="flex items-center gap-4">
                {/* Avatar / Initials */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                  {person.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {person.name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{person.role}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{person.team}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 md:mt-0 pl-14 md:pl-0">
                 <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {person.location}
                 </div>
                 
                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeColor(person.status)}`}>
                    {person.status}
                 </span>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Resources;
