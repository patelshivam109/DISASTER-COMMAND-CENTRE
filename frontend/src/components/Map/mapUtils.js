export const INDIA_CENTER = [22.9734, 78.6569];
export const DEFAULT_ZOOM = 5;

export const STATUS_OPTIONS = ["All", "Created", "Active", "Recovering", "Closed"];
export const SEVERITY_OPTIONS = ["All", "High", "Moderate", "Low"];

export function normalizeSeverity(severity) {
  const level = (severity || "").trim().toLowerCase();
  if (["critical", "high"].includes(level)) return "High";
  if (["moderate", "medium"].includes(level)) return "Moderate";
  if (level === "low") return "Low";
  return "Moderate";
}

export function getSeverityMeta(severity) {
  const normalizedSeverity = normalizeSeverity(severity);

  if (normalizedSeverity === "High") {
    return {
      borderClassName: "border-rose-200 bg-rose-50 text-rose-700",
      color: "#e11d48",
      glow: "rgba(225, 29, 72, 0.24)",
      label: "High",
      railClassName: "bg-rose-500",
    };
  }

  if (normalizedSeverity === "Low") {
    return {
      borderClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      color: "#16a34a",
      glow: "rgba(22, 163, 74, 0.22)",
      label: "Low",
      railClassName: "bg-emerald-500",
    };
  }

  return {
    borderClassName: "border-amber-200 bg-amber-50 text-amber-700",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.22)",
    label: "Moderate",
    railClassName: "bg-amber-500",
  };
}

export function getStatusMeta(status) {
  if (status === "Active") return { className: "border-teal-200 bg-teal-50 text-teal-700", dot: "bg-teal-500" };
  if (status === "Recovering") return { className: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (status === "Closed") return { className: "border-slate-200 bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return { className: "border-indigo-200 bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" };
}

export function hasCoordinates(disaster) {
  return Number.isFinite(disaster.latitude) && Number.isFinite(disaster.longitude);
}

export function formatCoordinate(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "Unavailable";
}
