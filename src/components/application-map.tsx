"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import L from "leaflet";
import { formatDate, type ApplicationView } from "@/lib/application-view";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status";
import { WORK_MODE_LABELS } from "@/lib/work-mode";
import { TagBadge } from "@/components/tag-badge";

type CityGroup = { key: string; name: string; latitude: number; longitude: number; applications: ApplicationView[] };

function PositionedPreview({ children, position }: { children: ReactNode; position: () => void }) {
  useLayoutEffect(() => { position(); });
  return children;
}

function groupByCity(applications: ApplicationView[]) {
  const grouped = new Map<string, CityGroup>();
  for (const application of applications) {
    if (!application.cityCode || application.latitude === null || application.longitude === null) continue;
    const current = grouped.get(application.cityCode);
    if (current) current.applications.push(application);
    else grouped.set(application.cityCode, { key: application.cityCode, name: application.location ?? "Ville inconnue", latitude: application.latitude, longitude: application.longitude, applications: [application] });
  }
  return [...grouped.values()];
}

export function ApplicationMap({ applications }: { applications: ApplicationView[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByCity(applications), [applications]);
  const [preview, setPreview] = useState<{ group: CityGroup; container: HTMLDivElement; pinned: boolean; close: () => void; position: () => void } | null>(null);
  const unmappedCount = applications.length - groups.reduce((count, group) => count + group.applications.length, 0);

  useEffect(() => {
    if (!containerRef.current || !groups.length) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([46.6, 2.4], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const overlay = document.createElement("div");
    overlay.className = "map-preview";
    overlay.hidden = true;
    map.getContainer().appendChild(overlay);
    L.DomEvent.disableClickPropagation(overlay);
    L.DomEvent.disableScrollPropagation(overlay);
    let activeGroup: CityGroup | null = null;
    let activeMarker: HTMLElement | null = null;
    let pinned = false;
    let suppressFocus = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelClose = () => { if (closeTimer) clearTimeout(closeTimer); };
    const close = () => { cancelClose(); activeGroup = null; pinned = false; overlay.hidden = true; setPreview(null); };
    const position = () => {
      if (!activeGroup) return;
      const size = map.getSize();
      overlay.style.width = `${Math.min(320, size.x - 24)}px`;
      const point = map.latLngToContainerPoint([activeGroup.latitude, activeGroup.longitude]);
      const above = point.y - 62;
      const below = size.y - point.y - 20;
      const placeAbove = above >= below;
      overlay.style.maxHeight = `${Math.max(50, placeAbove ? above : below)}px`;
      overlay.style.left = `${Math.max(12, Math.min(point.x - overlay.offsetWidth / 2, size.x - overlay.offsetWidth - 12))}px`;
      overlay.style.top = `${Math.max(12, Math.min(placeAbove ? point.y - overlay.offsetHeight - 50 : point.y + 8, size.y - overlay.offsetHeight - 12))}px`;
    };
    const scheduleClose = () => {
      cancelClose();
      if (!pinned) closeTimer = setTimeout(() => { if (!overlay.contains(document.activeElement) && document.activeElement !== activeMarker) close(); }, 200);
    };
    overlay.addEventListener("pointerenter", cancelClose);
    overlay.addEventListener("pointerleave", scheduleClose);
    overlay.addEventListener("focusin", cancelClose);
    overlay.addEventListener("focusout", scheduleClose);
    overlay.addEventListener("keydown", (event) => { if (event.key === "Escape") { const marker = activeMarker; close(); suppressFocus = true; marker?.focus(); suppressFocus = false; } });
    const observer = new ResizeObserver(position);
    observer.observe(overlay);
    map.on("move zoom resize", position);
    map.on("click", close);

    for (const group of groups) {
      const isRejected = group.applications.every((application) => application.status === "rejected");
      const marker = L.marker([group.latitude, group.longitude], {
        autoPanOnFocus: false,
        icon: L.divIcon({
          className: `application-map-marker${isRejected ? " application-map-marker-rejected" : ""}`,
          html: `<span><b>${group.applications.length}</b></span>`,
          iconSize: [38, 46],
          iconAnchor: [19, 46],
        }),
        title: `${group.name} — ${group.applications.length} candidature${group.applications.length > 1 ? "s" : ""}`,
      }).addTo(map);
      const element = marker.getElement()!;
      element.setAttribute("aria-label", group.applications.length === 1 ? `${group.applications[0].title} — ${group.name}. Ouvrir la fiche` : `${group.name} — ${group.applications.length} candidatures. Choisir une fiche`);
      const open = (persist = false) => {
        cancelClose();
        if (pinned && !persist) return;
        activeGroup = group;
        activeMarker = element;
        pinned = persist;
        overlay.hidden = false;
        setPreview({ group, container: overlay, pinned, close, position });
        position();
      };
      marker.on("mouseover", () => { if (window.matchMedia("(hover: hover)").matches) open(); });
      marker.on("mouseout", scheduleClose);
      element.addEventListener("focus", () => { if (!suppressFocus) open(); });
      element.addEventListener("blur", scheduleClose);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); marker.fire("click"); }
      });
      marker.on("click", () => { if (group.applications.length === 1) router.push(`/candidatures/${group.applications[0].id}`); else open(true); });
    }
    if (groups.length === 1) map.setView([groups[0].latitude, groups[0].longitude], 9);
    else map.fitBounds(groups.map((group) => [group.latitude, group.longitude] as [number, number]), { padding: [35, 35], maxZoom: 9 });
    return () => { cancelClose(); observer.disconnect(); overlay.remove(); map.remove(); };
  }, [groups, router]);

  if (!groups.length) return <div className="map-empty"><h3>Aucune candidature à placer</h3><p>Ajoutez une ville aux candidatures visibles pour les afficher sur la carte.</p></div>;
  return (
    <div className="map-view">
      <div ref={containerRef} className="application-map" aria-label="Carte des candidatures" />
      {unmappedCount > 0 ? <p className="map-notice">{unmappedCount} candidature{unmappedCount > 1 ? "s" : ""} sans ville géocodée non affichée{unmappedCount > 1 ? "s" : ""}.</p> : null}
      <p className="map-hint">Cliquez sur un pin pour ouvrir la fiche ou choisir parmi les candidatures de la ville.</p>
      {preview && groups.includes(preview.group) ? createPortal(
        <PositionedPreview position={preview.position}>
        <section aria-label={`Candidatures à ${preview.group.name}`}>
          <div className="map-preview-heading"><div><h3>{preview.group.name}</h3><p>{preview.group.applications.length} candidature{preview.group.applications.length > 1 ? "s" : ""}</p></div><button type="button" className="icon-button" aria-label="Fermer l’aperçu" onClick={preview.close}><X size={17} /></button></div>
          <ul className="map-preview-list">
            {(preview.pinned ? preview.group.applications : preview.group.applications.slice(0, 3)).map((application) => (
              <li key={application.id}><Link href={`/candidatures/${application.id}`} className="map-preview-job"><strong>{application.title}</strong><span>{application.company}</span><span className={`status-badge ${STATUS_STYLES[application.status]}`}>{STATUS_LABELS[application.status]}</span><small>{WORK_MODE_LABELS[application.workMode]} · {formatDate(application.applicationDate)}</small><span className="tag-list">{application.tags.map((tag) => <TagBadge key={tag.id} name={tag.name} />)}</span></Link></li>
            ))}
          </ul>
          {!preview.pinned && preview.group.applications.length > 3 ? <p className="map-preview-more">Et {preview.group.applications.length - 3} autre(s). Cliquez sur le pin pour toutes les voir.</p> : null}
        </section></PositionedPreview>, preview.container,
      ) : null}
    </div>
  );
}
