import { Filter, RotateCcw, Search } from "lucide-react";
import { SEVERITY_OPTIONS, STATUS_OPTIONS } from "./mapUtils";

export default function MapFilters({
  statusFilter,
  severityFilter,
  searchTerm,
  onStatusChange,
  onSeverityChange,
  onSearchChange,
  onReset,
  resultCount,
}) {
  return (
    <div className="command-filter-bar">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="command-input pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search incident type or ID"
          type="text"
          value={searchTerm}
        />
      </div>

      <label className="command-select-wrap">
        <Filter className="h-4 w-4 text-slate-400" />
        <select className="command-select" onChange={(event) => onStatusChange(event.target.value)} value={statusFilter}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All statuses" : option}
            </option>
          ))}
        </select>
      </label>

      <label className="command-select-wrap">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" />
        <select
          className="command-select"
          onChange={(event) => onSeverityChange(event.target.value)}
          value={severityFilter}
        >
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All severity" : option}
            </option>
          ))}
        </select>
      </label>

      <button className="command-icon-button" onClick={onReset} title="Reset filters" type="button">
        <RotateCcw className="h-4 w-4" />
      </button>

      <span className="command-result-chip">{resultCount} visible</span>
    </div>
  );
}
