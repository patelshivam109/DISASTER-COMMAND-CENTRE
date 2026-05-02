import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getSeverityMeta } from "./mapUtils";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createMarkerIcon(disaster, isSelected) {
  const severity = getSeverityMeta(disaster.severity);

  return L.divIcon({
    className: "disaster-map-icon-wrapper",
    html: `<span class="command-marker ${isSelected ? "is-selected" : ""}" style="--marker-color:${severity.color}; --marker-glow:${severity.glow};"></span>`,
    iconSize: isSelected ? [28, 28] : [22, 22],
    iconAnchor: isSelected ? [14, 14] : [11, 11],
    popupAnchor: [0, -14],
  });
}

function popupHtml(disaster) {
  const severity = getSeverityMeta(disaster.severity);
  return `
    <div class="command-popup">
      <div class="command-popup-head">
        <div>
          <p class="command-popup-type">${escapeHtml(disaster.type)}</p>
          <p class="command-popup-id">Incident #${escapeHtml(disaster.id)}</p>
        </div>
        <span class="command-popup-pill" style="color:${severity.color}; border-color:${severity.color}33; background:${severity.color}14;">${escapeHtml(severity.label)}</span>
      </div>
      <div class="command-popup-grid">
        <div><span>Status</span><strong>${escapeHtml(disaster.status)}</strong></div>
        <div><span>Severity</span><strong>${escapeHtml(severity.label)}</strong></div>
      </div>
    </div>
  `;
}

export default function MarkerLayer({ disasters, selectedId, onSelect }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 42,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "command-cluster-wrapper",
          html: `<span class="command-cluster">${cluster.getChildCount()}</span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
      },
    });

    disasters.forEach((disaster) => {
      const marker = L.marker([disaster.latitude, disaster.longitude], {
        icon: createMarkerIcon(disaster, disaster.id === selectedId),
        riseOnHover: true,
      });

      marker.bindPopup(popupHtml(disaster), {
        closeButton: false,
        minWidth: 220,
      });

      marker.on("click", () => {
        onSelect(disaster);
        map.flyTo([disaster.latitude, disaster.longitude], Math.max(map.getZoom(), 7), {
          animate: true,
          duration: 0.65,
        });
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [disasters, map, onSelect, selectedId]);

  return null;
}
