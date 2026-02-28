import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center transition-colors">
      <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
        Disaster Relief Portal
      </h1>

      <div className="flex items-center gap-4">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/disasters">Disasters</NavLink>
        <NavLink to="/resources">Resources</NavLink>
        <NavLink to="/volunteers">Volunteers</NavLink>
      </div>
    </nav>
  );
}
