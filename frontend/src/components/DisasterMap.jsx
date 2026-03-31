import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;

function normalizeSeverity(severity) {
  const level = (severity || "").trim().toLowerCase();
  if (["critical", "high"].includes(level)) return "high";
  if (["moderate", "medium"].includes(level)) return "medium";
  if (level === "low") return "low";
  return "medium";
}

function getSeverityMeta(severity) {
  const normalizedSeverity = normalizeSeverity(severity);

  if (normalizedSeverity === "high") {
    return {
      badgeClassName: "bg-red-100 text-red-700 border-red-200",
      color: "#dc2626",
      glow: "rgba(220, 38, 38, 0.22)",
      label: "High",
    };
  }

  if (normalizedSeverity === "low") {
    return {
      badgeClassName: "bg-emerald-100 text-emerald-700 border-emerald-200",
      color: "#16a34a",
      glow: "rgba(22, 163, 74, 0.22)",
      label: "Low",
    };
  }

  return {
    badgeClassName: "bg-amber-100 text-amber-700 border-amber-200",
    color: "#eab308",
    glow: "rgba(234, 179, 8, 0.24)",
    label: "Medium",
  };
}

function createMarkerIcon(severity) {
  const { color, glow } = getSeverityMeta(severity);

  return divIcon({
    className: "disaster-map-icon-wrapper",
    html: `<span class="disaster-map-icon" style="background:${color}; box-shadow: 0 0 0 6px ${glow};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

function hasCoordinates(disaster) {
  return Number.isFinite(disaster.latitude) && Number.isFinite(disaster.longitude);
}

export default function DisasterMap({ disasters = [], isLoading = false, error = "" }) {
  const mappedDisasters = disasters.filter(hasCoordinates);
  const missingCoordinatesCount = disasters.length - mappedDisasters.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">India Incident Map</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Live map view of disaster activity, centered on India for command monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {mappedDisasters.length} mapped
          </span>
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
            High
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
            Medium
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            Low
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!error && isLoading ? (
        <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          Loading disaster map...
        </div>
      ) : null}

      {!error && !isLoading && mappedDisasters.length === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No mapped disasters available.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add incidents with latitude and longitude to display them here.
          </p>
        </div>
      ) : null}

      {!error && !isLoading && mappedDisasters.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <MapContainer
            center={INDIA_CENTER}
            className="h-[420px] w-full md:h-[500px]"
            scrollWheelZoom
            zoom={DEFAULT_ZOOM}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="topright" />

            {mappedDisasters.map((disaster) => {
              const severityMeta = getSeverityMeta(disaster.severity || disaster.priority);

              return (
                <Marker
                  key={disaster.id}
                  icon={createMarkerIcon(disaster.severity || disaster.priority)}
                  position={[disaster.latitude, disaster.longitude]}
                >
                  <Popup minWidth={220}>
                    <div className="space-y-3 text-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{disaster.type}</p>
                          <p className="text-xs text-slate-500">{disaster.location}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityMeta.badgeClassName}`}
                        >
                          {severityMeta.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="font-medium text-slate-500">Status</p>
                          <p className="mt-1 font-semibold text-slate-900">{disaster.status}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="font-medium text-slate-500">Affected</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {disaster.affected_display || "N/A"}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Coordinates: {disaster.latitude.toFixed(4)}, {disaster.longitude.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : null}

      {missingCoordinatesCount > 0 ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {missingCoordinatesCount} incident{missingCoordinatesCount > 1 ? "s are" : " is"} hidden because
          coordinates are missing.
        </p>
      ) : null}
    </section>
  );
}
