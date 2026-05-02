import { useMemo, useState } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { Activity, AlertOctagon, RadioTower } from "lucide-react";
import "leaflet/dist/leaflet.css";
import MapFilters from "./MapFilters";
import MarkerLayer from "./MarkerLayer";
import SidePanel from "./SidePanel";
import { DEFAULT_ZOOM, INDIA_CENTER, hasCoordinates, normalizeSeverity } from "./mapUtils";

export default function MapView({ disasters = [], isLoading = false, error = "" }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisaster, setSelectedDisaster] = useState(null);

  const mappedDisasters = useMemo(() => disasters.filter(hasCoordinates), [disasters]);

  const filteredDisasters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return mappedDisasters.filter((disaster) => {
      const matchesStatus = statusFilter === "All" || disaster.status === statusFilter;
      const matchesSeverity = severityFilter === "All" || normalizeSeverity(disaster.severity) === severityFilter;
      const matchesSearch =
        !normalizedSearch ||
        disaster.type.toLowerCase().includes(normalizedSearch) ||
        String(disaster.id).includes(normalizedSearch);

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [mappedDisasters, searchTerm, severityFilter, statusFilter]);

  const activeCount = disasters.filter((disaster) => disaster.status === "Active").length;
  const highCount = disasters.filter((disaster) => normalizeSeverity(disaster.severity) === "High").length;
  const missingCoordinatesCount = disasters.length - mappedDisasters.length;

  const handleReset = () => {
    setStatusFilter("All");
    setSeverityFilter("All");
    setSearchTerm("");
  };

  const handleSelect = (disaster) => {
    setSelectedDisaster(disaster);
  };

  return (
    <section className="command-center-shell">
      <div className="command-center-header">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            <RadioTower className="h-4 w-4 text-teal-600 dark:text-teal-300" />
            National Disaster Watch
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Map-Based Command Center
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Geographic monitoring, severity triage, and field-ready incident selection for India operations.
          </p>
        </div>

        <div className="command-kpi-strip">
          <div className="command-kpi">
            <Activity className="h-4 w-4" />
            <span>{activeCount} active</span>
          </div>
          <div className="command-kpi danger">
            <AlertOctagon className="h-4 w-4" />
            <span>{highCount} high</span>
          </div>
        </div>
      </div>

      <MapFilters
        onReset={handleReset}
        onSearchChange={setSearchTerm}
        onSeverityChange={setSeverityFilter}
        onStatusChange={setStatusFilter}
        resultCount={filteredDisasters.length}
        searchTerm={searchTerm}
        severityFilter={severityFilter}
        statusFilter={statusFilter}
      />

      {error ? <div className="command-alert">{error}</div> : null}

      {!error && isLoading ? (
        <div className="command-map-skeleton">
          <div className="h-full w-full animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800" />
        </div>
      ) : null}

      {!error && !isLoading ? (
        <div className="command-workspace">
          <div className="command-map-frame">
            {filteredDisasters.length > 0 ? (
              <MapContainer
                center={INDIA_CENTER}
                className="h-full min-h-[560px] w-full"
                scrollWheelZoom
                zoom={DEFAULT_ZOOM}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ZoomControl position="topright" />
                <MarkerLayer disasters={filteredDisasters} onSelect={handleSelect} selectedId={selectedDisaster?.id} />
              </MapContainer>
            ) : (
              <div className="command-empty-map">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No incidents match this view.</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adjust filters or add mapped disaster coordinates.</p>
              </div>
            )}
          </div>

          <SidePanel disaster={selectedDisaster} mappedCount={mappedDisasters.length} totalCount={disasters.length} />
        </div>
      ) : null}

      {missingCoordinatesCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          {missingCoordinatesCount} incident{missingCoordinatesCount > 1 ? "s are" : " is"} hidden because coordinates are missing.
        </p>
      ) : null}
    </section>
  );
}
