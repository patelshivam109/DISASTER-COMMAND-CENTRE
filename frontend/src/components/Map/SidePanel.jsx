import { AlertTriangle, Compass, Crosshair, Radio, ShieldCheck } from "lucide-react";
import { formatCoordinate, getSeverityMeta, getStatusMeta } from "./mapUtils";

function Badge({ children, className }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

export default function SidePanel({ disaster, totalCount, mappedCount }) {
  if (!disaster) {
    return (
      <aside className="command-side-panel">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Situation Desk</p>
            <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">No incident selected</h3>
          </div>
          <div className="command-panel-icon">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <div className="command-empty-panel">
            <Crosshair className="h-5 w-5 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Select a marker for field context.</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Marker selection updates this panel without leaving the command map.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="command-mini-stat">
              <span>Total incidents</span>
              <strong>{totalCount}</strong>
            </div>
            <div className="command-mini-stat">
              <span>Mapped</span>
              <strong>{mappedCount}</strong>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const severity = getSeverityMeta(disaster.severity);
  const status = getStatusMeta(disaster.status);

  return (
    <aside className="command-side-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">Selected Incident</p>
          <h3 className="mt-2 text-xl font-bold leading-tight text-slate-950 dark:text-white">{disaster.type}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Incident ID #{disaster.id}</p>
        </div>
        <div className="command-panel-icon">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge className={status.className}>
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {disaster.status}
        </Badge>
        <Badge className={severity.borderClassName}>{severity.label} severity</Badge>
      </div>

      <div className="mt-6 space-y-3">
        <div className="command-detail-row">
          <Compass className="h-4 w-4 text-slate-400" />
          <div>
            <span>Latitude</span>
            <strong>{formatCoordinate(disaster.latitude)}</strong>
          </div>
        </div>
        <div className="command-detail-row">
          <Compass className="h-4 w-4 text-slate-400" />
          <div>
            <span>Longitude</span>
            <strong>{formatCoordinate(disaster.longitude)}</strong>
          </div>
        </div>
        <div className="command-detail-row">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <div>
            <span>Response posture</span>
            <strong>{disaster.status === "Closed" ? "Archive monitoring" : "Field coordination active"}</strong>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Severity signal</span>
          <span>{severity.label}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full ${severity.railClassName}`}
            style={{ width: severity.label === "High" ? "92%" : severity.label === "Moderate" ? "58%" : "28%" }}
          />
        </div>
      </div>
    </aside>
  );
}
