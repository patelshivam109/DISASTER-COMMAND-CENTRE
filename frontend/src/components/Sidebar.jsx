import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useDarkMode from '../hooks/useDarkMode';
import { getUserRole, isLoggedIn } from '../utils/auth';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Package, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useDarkMode();
  const hasUser = isLoggedIn();
  const role = hasUser ? getUserRole() : 'guest';
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/disasters", icon: <AlertTriangle size={20} />, label: "Disasters" },
    { to: "/resources", icon: <Package size={20} />, label: "Resources" },
    { to: "/volunteers", icon: <Users size={20} />, label: role === "admin" ? "Volunteers" : "My Tasks" },
  ];

  return (
    <aside 
      className={`relative flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* --- Logo Section --- */}
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0">
          <ShieldAlert size={24} />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
            ReliefPortal
          </span>
        )}
      </div>

      {/* --- Collapse Toggle --- */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer shadow-sm"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* --- Navigation --- */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'}
            `}
          >
            <div className="shrink-0">{item.icon}</div>
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all origin-left bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-50">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* --- Bottom Role Info, Theme Toggle & Auth Controls --- */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-xs text-gray-500 dark:text-gray-400">
        {!isCollapsed && (
          <div className="space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-200">Current role</p>
            <p className="capitalize">{role}</p>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between text-xs rounded-lg px-2 py-1.5 border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
        >
          {!isCollapsed && <span>{isDark ? 'Dark mode' : 'Light mode'}</span>}
          {isDark ? (
            <Sun size={14} className="text-amber-300" />
          ) : (
            <Moon size={14} className="text-slate-600" />
          )}
        </button>

        <button
          onClick={hasUser ? handleLogout : () => navigate('/login')}
          className="w-full mt-1 text-left text-blue-600 dark:text-blue-400 hover:underline text-xs cursor-pointer"
        >
          {hasUser ? 'Log out' : 'Log in / switch account'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
