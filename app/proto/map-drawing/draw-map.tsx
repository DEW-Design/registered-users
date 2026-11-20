"use client";

// The map of /proto/map-drawing: the product's tiles and bounds, with a drawing engine of its own so the shape can talk while it is drawn.
// Click to place a point (polygon) or the centre and then the edge (circle); the pointer, the points and the radius are reported live; a finished
// shape can be selected and its points dragged. Keys: Enter finishes, Backspace takes the last point back, Escape cancels.
// Loaded with next/dynamic and ssr:false (Leaflet reads `window`). Not product, and not in components/** (1.10): if a direction is chosen, the
// behaviour moves there with the designer's override.

import { Fragment, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, Polygon, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { MapZoomButtons } from "@/app/pages/_shared/map-search/map-zoom-buttons";
import { MAP_CONTROLS_Z_INDEX } from "@/lib/layers";
import { cx } from "@/utils/cx";
import { bearingDeg, pointAt, type Controller, type LatLon } from "./drawing";
import { NumberBubble } from "./number-bubble";

const SA_CENTER: [number, number] = [-30.5, 135.8];
const SA_MAX_BOUNDS: L.LatLngBoundsExpression = [
  [-40, 124],
  [-23, 152],
];
const BRAND = "var(--color-brand-600)";

const shapeStyle = (selected: boolean, drawing: boolean, dashed = false) => ({
  color: BRAND,
  fillColor: BRAND,
  fillOpacity: selected ? 0.28 : 0.15,
  weight: selected ? 3 : 2,
  dashArray: dashed ? "6 6" : undefined,
  interactive: !drawing,
});

// Whether the pointer is a finger: its handles are 44px targets, a mouse's 28px (the dot drawn is 12px either way).
const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const TARGET = COARSE ? 44 : 28;

// A handle is a target around a dot: a white dot with the brand ring. Icons are made once and reused: a new icon object on every render makes
// Leaflet swap the element for a new one, and a handle that is being dragged is swapped out from under the pointer (the drag stalled after a few pixels).
const iconCache = new Map<string, L.DivIcon>();
const handleIcon = (opts: { first?: boolean; last?: boolean; ring?: boolean } = {}) => {
  const key = `${!!opts.first}${!!opts.last}${!!opts.ring}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const dot = opts.first ? 16 : 12;
  const icon = L.divIcon({
    className: "",
    iconSize: [TARGET, TARGET],
    iconAnchor: [TARGET / 2, TARGET / 2],
    html: `<div style="width:${TARGET}px;height:${TARGET}px;display:flex;align-items:center;justify-content:center;cursor:${opts.first ? "pointer" : "grab"}">
      <div class="draw-dot" style="width:${dot}px;height:${dot}px;border-radius:999px;background:${opts.last ? BRAND : "var(--ui-bg-primary)"};border:2px solid ${BRAND};box-shadow:var(--shadow-sm)${opts.ring ? `,0 0 0 4px color-mix(in srgb, ${BRAND} 25%, transparent)` : ""};transition:transform 120ms ease-out,box-shadow 120ms ease-out"></div>
    </div>`,
  });
  iconCache.set(key, icon);
  return icon;
};

// A dot on the middle of an edge: pressing it adds a point there, which can then be dragged.
const midIcon = L.divIcon({
  className: "",
  iconSize: [TARGET - 4, TARGET - 4],
  iconAnchor: [(TARGET - 4) / 2, (TARGET - 4) / 2],
  html: `<div style="width:${TARGET - 4}px;height:${TARGET - 4}px;display:flex;align-items:center;justify-content:center;cursor:pointer"><div class="draw-mid" style="width:8px;height:8px;border-radius:999px;background:var(--ui-bg-primary);border:2px solid ${BRAND};opacity:.75;transition:transform 120ms ease-out,opacity 120ms ease-out"></div></div>`,
});

// "Edit", on the shape itself: pressing it (or the shape) takes a used area back to be checked and edited. It shows while the pointer is over the map, and always on a screen with no pointer to hover with.
const editIcon = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<div class="draw-edit-chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Edit</div>`,
});

/** The middle of a shape, for a label on it. */
const centreOf = (b: Boundary): LatLon => (b.kind === "circle" ? b.center : [b.points.reduce((n, p) => n + p[0], 0) / b.points.length, b.points.reduce((n, p) => n + p[1], 0) / b.points.length]);

/** A point's tooltip: its number (or name) and its coordinates, to the metre. */
function PointTip({ n, label, p }: { n?: number; label?: string; p: LatLon }) {
  return (
    <span className="draw-tip-line">
      {/* A number is the steps' bubble (also the table's #); a name ("Centre") is plain text. */}
      {n !== undefined ? <NumberBubble n={n} /> : <b>{label}</b>}
      <span>{p[0].toFixed(5)}, {p[1].toFixed(5)}</span>
    </span>
  );
}

/** The dot inside a handle's element: what is pressed, grown while it is held. */
const dotOf = (el: HTMLElement | undefined) => el?.firstElementChild?.firstElementChild as HTMLElement | null | undefined;

/**
 * A point of a selected shape that can be moved. How it feels is the point of it:
 * - the marker is the pointer's: while it is held React does not move it (it is given the spot it was picked up from), so Leaflet's own drag is the only writer;
 * - the shape and the numbers follow once a frame, with the latest position, not once for every pointer event;
 * - it is picked up after the pointer has moved 2px (10px for a finger, the map's `clickTolerance`), so a press that wobbles is still a press;
 * - held, it grows a little and the cursor stays "grabbing" wherever the pointer goes; near the map's edge the map pans after it (`autoPan`);
 * - Escape while holding it puts it back where it was; the arrow keys move a focused point by a pixel, ten with Shift.
 */
function Handle({ position, icon, title, onMove, onGrab, hot, onHot, tip }: { position: LatLon; icon: L.DivIcon; title: string; onMove: (p: LatLon) => void; /** Told when the point is pressed or picked up: the shape it belongs to becomes the one being edited. */ onGrab?: () => void; /** The pointer is on this point, here or in the table: it is lit and says where it is. */ hot: boolean; onHot: (on: boolean) => void; /** What the tooltip says while it is lit. */ tip: React.ReactNode }) {
  const [held, setHeld] = useState<LatLon | null>(null);
  const move = useRef(onMove);
  const grab = useRef(onGrab);
  useEffect(() => {
    move.current = onMove;
    grab.current = onGrab;
  });
  const frame = useRef(0);
  const latest = useRef<LatLon | null>(null);
  const origin = useRef<LatLon | null>(null);
  const cancelled = useRef(false);
  const stopKey = useRef<(() => void) | null>(null);
  const marker = useRef<L.Marker>(null);
  const hotRef = useRef(onHot);
  useEffect(() => {
    hotRef.current = onHot;
  });
  // Lit: a halo and a larger dot (the dot is what grows; the target does not move under the pointer).
  useEffect(() => {
    marker.current?.getElement()?.classList.toggle("is-hot", hot);
  }, [hot]);

  const flush = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (latest.current) move.current(latest.current);
    latest.current = null;
  };

  return (
    <Marker
      ref={marker}
      position={held ?? position}
      draggable
      autoPan
      autoPanPadding={[64, 64]}
      autoPanSpeed={12}
      icon={icon}
      eventHandlers={{
        mouseover() {
          hotRef.current(true);
        },
        mouseout() {
          if (!held) hotRef.current(false);
        },
        // A press on a point that does not move it is not a press on the map (which would deselect the shape): Leaflet only stops a click at a marker that listens for it.
        click() {
          grab.current?.();
        },
        add(e) {
          // Arrow keys move a focused point by a pixel (ten with Shift), whatever the zoom; they do not pan the map.
          const marker = e.target as L.Marker;
          // The name is an aria-label, not a title: a native tooltip would appear beside the one that shows the coordinates.
          marker.getElement()?.setAttribute("aria-label", title);
          // The distance the pointer must travel before the point is picked up: 2px for a mouse, 10px for a finger (Leaflet's default is 3).
          const draggable = (marker as unknown as { dragging?: { _draggable?: { options: { clickTolerance: number } } } }).dragging?._draggable;
          if (draggable) draggable.options.clickTolerance = COARSE ? 10 : 2;
          marker.getElement()?.addEventListener("keydown", (ev) => {
            const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
            if (!dir || ev.altKey || ev.metaKey || ev.ctrlKey) return;
            ev.preventDefault();
            ev.stopPropagation();
            const m = (marker as unknown as { _map: L.Map })._map;
            const step = ev.shiftKey ? 10 : 1;
            const at = m.latLngToContainerPoint(marker.getLatLng());
            const next = m.containerPointToLatLng(L.point(at.x + dir[0] * step, at.y + dir[1] * step));
            move.current([next.lat, next.lng]);
          });
        },
        dragstart(e) {
          grab.current?.();
          hotRef.current(true);
          const marker = e.target as L.Marker;
          origin.current = [marker.getLatLng().lat, marker.getLatLng().lng];
          cancelled.current = false;
          setHeld(origin.current);
          const dot = dotOf(marker.getElement());
          if (dot) dot.style.transform = "scale(1.3)";
          document.body.style.cursor = "grabbing";
          const onKey = (ev: KeyboardEvent) => {
            if (ev.key !== "Escape") return;
            cancelled.current = true;
            (marker as unknown as { dragging?: { _draggable?: { finishDrag?: (noInertia?: boolean) => void } } }).dragging?._draggable?.finishDrag?.(true);
          };
          window.addEventListener("keydown", onKey);
          stopKey.current = () => window.removeEventListener("keydown", onKey);
        },
        drag(e) {
          const ll = (e.target as L.Marker).getLatLng();
          latest.current = [ll.lat, ll.lng];
          if (!frame.current) {
            frame.current = requestAnimationFrame(() => {
              frame.current = 0;
              if (latest.current) move.current(latest.current);
            });
          }
        },
        dragend(e) {
          const marker = e.target as L.Marker;
          stopKey.current?.();
          stopKey.current = null;
          document.body.style.cursor = "";
          const dot = dotOf(marker.getElement());
          if (dot) dot.style.transform = "";
          if (cancelled.current && origin.current) {
            // Changed their mind: back to where it was picked up.
            latest.current = null;
            if (frame.current) cancelAnimationFrame(frame.current);
            frame.current = 0;
            marker.setLatLng(origin.current);
            move.current(origin.current);
          } else {
            flush();
          }
          setHeld(null);
          // Let go with the pointer still on the point: it stays lit, showing where it landed (no new mouseover comes while the pointer does not leave).
          if (!marker.getElement()?.matches(":hover")) hotRef.current(false);
        },
      }}
    >
      {hot && (
        <Tooltip permanent direction="top" offset={[0, -(TARGET / 2) - 2]} className="draw-point-tip">
          {tip}
        </Tooltip>
      )}
    </Marker>
  );
}

const kmBetween = (a: LatLon, b: LatLon) => L.latLng(a).distanceTo(L.latLng(b)) / 1000;

function Engine({ d, editAll, editChips }: { d: Controller; editAll: boolean; editChips: boolean }) {
  const map = useMap();
  const drawing = d.tool !== null;

  const { registerMap } = d;
  useEffect(() => {
    registerMap(map);
    return () => registerMap(null);
  }, [map, registerMap]);

  useEffect(() => {
    const el = map.getContainer();
    el.classList.toggle("is-drawing", drawing);
    if (drawing) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [drawing, map]);

  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Enter") d.finishPolygon();
      else if (e.key === "Escape") d.cancel();
      else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        d.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, d]);

  // A circle is drawn by pressing for the centre and dragging out: one gesture. The map does not pan while that tool is on (a press would be a pan).
  // A press that does not move is a click, and the two-click way still works (the centre, then the edge), which is how a touch screen draws one.
  const circleTool = d.tool === "circle";
  useEffect(() => {
    if (circleTool) map.dragging.disable();
    else map.dragging.enable();
    return () => {
      map.dragging.enable();
    };
  }, [circleTool, map]);
  // The latest controller, for a handler made at the press and run at the release (the centre was set in between).
  const latest = useRef(d);
  useEffect(() => {
    latest.current = d;
  });
  const press = useRef<{ x: number; y: number; at: LatLon; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    // Escape, or another tool, while a circle is being dragged out: letting go afterwards draws nothing.
    if (!circleTool) press.current = null;
  }, [circleTool]);

  useMapEvents({
    mousedown(e) {
      if (d.tool !== "circle" || d.circleCenter || e.originalEvent.button !== 0) return;
      press.current = { x: e.containerPoint.x, y: e.containerPoint.y, at: [e.latlng.lat, e.latlng.lng], dragging: false };
      // Let go anywhere, the pointer may be outside the map by then.
      const up = (ev: MouseEvent) => {
        window.removeEventListener("mouseup", up);
        const p = press.current;
        press.current = null;
        if (!p?.dragging) return;
        const ll = map.mouseEventToLatLng(ev);
        suppressClick.current = true;
        latest.current.circleClick([ll.lat, ll.lng]);
      };
      window.addEventListener("mouseup", up);
    },
    click(e) {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      const p: LatLon = [e.latlng.lat, e.latlng.lng];
      if (d.tool === "polygon") d.addPoint(p);
      else if (d.tool === "circle") d.circleClick(p);
      else if (!d.pending && !editAll) d.select(null);
    },
    mousemove(e) {
      d.setCursor([e.latlng.lat, e.latlng.lng]);
      // Past 6px from the press it is a drag: the centre is set where it was pressed and the circle grows with the pointer.
      const p = press.current;
      if (p && !p.dragging && Math.hypot(e.containerPoint.x - p.x, e.containerPoint.y - p.y) > 6) {
        p.dragging = true;
        d.setCircleCenter(p.at);
        d.setCircleHeld(true);
      }
    },
    mouseout() {
      d.setCursor(null);
    },
    moveend() {
      const c = map.getCenter();
      d.saveView([c.lat, c.lng], map.getZoom());
    },
    dblclick() {
      if (d.tool === "polygon") d.finishPolygon();
    },
  });

  const all: Boundary[] = d.pending ? [...d.areas, d.pending] : d.areas;
  const sel = d.selected;
  const editable: Boundary[] = d.pending ? [d.pending] : editAll ? d.areas : sel ? [sel] : [];

  return (
    <>
      {all.map((b) => {
        const isSel = b.id === d.selectedId;
        const dashed = b.id === d.pending?.id;
        // In the form a used area is edited by taking it back to be checked (the chip, or the shape); in the workspace pressing it selects it.
        const handlers = { click: () => (drawing ? undefined : editChips && !d.pending ? (d.editArea(b.id), d.fitShape(b, 40)) : d.select(b.id)) };
        const shape = { ...shapeStyle(isSel, drawing, dashed), className: isSel ? "draw-shape draw-shape-selected" : "draw-shape draw-shape-selectable" };
        return b.kind === "circle" ? (
          <Circle key={b.id} center={b.center} radius={b.radiusKm * 1000} pathOptions={shape} eventHandlers={handlers} />
        ) : (
          <Polygon key={b.id} positions={b.points} pathOptions={shape} eventHandlers={handlers} />
        );
      })}

      {editChips &&
        !drawing &&
        !d.pending &&
        d.areas.map((b) => (
          <Marker
            key={`edit-${b.id}`}
            position={centreOf(b)}
            icon={editIcon}
            title="Edit this area"
            eventHandlers={{
              click: () => {
                d.editArea(b.id);
                d.fitShape(b, 40);
              },
            }}
          />
        ))}

      {/* Points can be moved: a shape waiting to be checked is edited first; where every area is editable (the workspace) all of them show their points, so there is
          nothing to select before a point can be grabbed (pressing a point makes its shape the one in the table); otherwise only the selected shape does. */}
      {!drawing &&
        editable.map((b) => (
          <Fragment key={b.id}>
            {b.kind === "polygon" ? (
              <>
                {b.points.map((p, i) => (
                  <Handle
                    key={`${b.id}-${i}`}
                    position={p}
                    icon={handleIcon()}
                    title={`Point ${i + 1}. Drag it, or use the arrow keys.`}
                    hot={d.hoverPoint?.areaId === b.id && d.hoverPoint.index === i}
                    onHot={(on) => d.setHoverPoint(on ? { areaId: b.id, index: i } : null)}
                    tip={<PointTip n={i + 1} p={p} />}
                    onGrab={() => d.select(b.id)}
                    onMove={(ll) => {
                      d.setCursor(ll);
                      d.update(b.id, { ...b, points: b.points.map((q, j) => (j === i ? ll : q)) });
                    }}
                  />
                ))}
                {b.id === sel?.id &&
                  b.points.map((p, i) => {
                    const q = b.points[(i + 1) % b.points.length];
                    return (
                      <Marker
                        key={`mid-${b.points.length}-${i}`}
                        position={[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]}
                        icon={midIcon}
                        title="Add a point here"
                        eventHandlers={{
                          click: () => d.update(b.id, { ...b, points: [...b.points.slice(0, i + 1), [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ...b.points.slice(i + 1)] }),
                        }}
                      />
                    );
                  })}
              </>
            ) : (
              <>
                <Handle
                  position={b.center}
                  icon={handleIcon()}
                  title="Centre. Drag it, or use the arrow keys."
                  hot={d.hoverPoint?.areaId === b.id && d.hoverPoint.index === 0}
                  onHot={(on) => d.setHoverPoint(on ? { areaId: b.id, index: 0 } : null)}
                  tip={<PointTip label="Centre" p={b.center} />}
                  onGrab={() => d.select(b.id)}
                  onMove={(ll) => {
                    d.setCursor(ll);
                    d.update(b.id, { ...b, center: ll });
                  }}
                />
                <Handle
                  position={pointAt(b.center, b.radiusKm, d.bearingOf(b.id))}
                  icon={handleIcon({ last: true })}
                  title="Radius. Drag it, or use the arrow keys."
                  hot={d.hoverPoint?.areaId === b.id && d.hoverPoint.index === 1}
                  onHot={(on) => d.setHoverPoint(on ? { areaId: b.id, index: 1 } : null)}
                  tip={<span className="draw-tip-line">Radius {b.radiusKm} km</span>}
                  onGrab={() => d.select(b.id)}
                  onMove={(ll) => {
                    d.setCursor(ll);
                    d.setBearing(b.id, bearingDeg(b.center, ll));
                    d.update(b.id, { ...b, radiusKm: Math.max(0.1, Math.round(kmBetween(b.center, ll) * 10) / 10) });
                  }}
                />
              </>
            )}
          </Fragment>
        ))}

      {/* The polygon being drawn: the points, the line so far, and a line to the pointer that shows what the next click makes. */}
      {d.tool === "polygon" && d.points.length > 0 && (
        <>
          {d.points.length >= 2 && <Polygon positions={d.cursor ? [...d.points, d.cursor] : d.points} pathOptions={{ color: BRAND, fillColor: BRAND, fillOpacity: 0.12, weight: 2, dashArray: "6 6", interactive: false }} />}
          {d.points.length === 1 && d.cursor && <Polyline positions={[d.points[0], d.cursor]} pathOptions={{ color: BRAND, weight: 2, dashArray: "6 6", interactive: false }} />}
          {d.points.map((p, i) => (
            <Marker
              // Leaflet fixes `interactive` when a marker is made, so the first point is made again once it can close the shape.
              key={`d-${i}-${i === 0 && d.points.length >= 3 ? "close" : "open"}`}
              position={p}
              icon={handleIcon({ first: i === 0 && d.points.length >= 3, last: i === d.points.length - 1, ring: i === 0 && d.points.length >= 3 })}
              interactive={i === 0 && d.points.length >= 3}
              eventHandlers={{ click: () => d.finishPolygon() }}
            />
          ))}
        </>
      )}

      {/* The circle being drawn: the centre, the circle the pointer would make, and the radius handle at the pointer with the radius beside it. */}
      {d.tool === "circle" && d.circleCenter && (
        <>
          <Marker position={d.circleCenter} icon={handleIcon({ last: true })} interactive={false} />
          {d.draftRadiusKm !== null && d.cursor && (
            <>
              <Circle center={d.circleCenter} radius={d.draftRadiusKm * 1000} pathOptions={{ color: BRAND, fillColor: BRAND, fillOpacity: 0.12, weight: 2, dashArray: "6 6", interactive: false }} />
              <Polyline positions={[d.circleCenter, d.cursor]} pathOptions={{ color: BRAND, weight: 2, interactive: false }} />
              <Marker position={d.cursor} icon={handleIcon({ ring: d.circleHeld })} interactive={false}>
                <Tooltip permanent direction="top" offset={[0, -12]} className="draw-radius-tip">
                  {d.draftRadiusKm} km
                </Tooltip>
              </Marker>
            </>
          )}
        </>
      )}
    </>
  );
}

/** The zoom buttons are inside the map's own element, so a press on one would also be a click on the map (it would deselect a shape, or add a point). */
function Zoom({ className }: { className?: string }) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);
  return (
    <div ref={ref} className={className}>
      <MapZoomButtons map={map} />
    </div>
  );
}

// What the cursor says is decided by the mode, not by what happens to be under it:
// - drawing: a crosshair over the whole map (a press places a point), the point that closes the shape excepted (a pointing hand);
// - a selected shape: an open hand (it can be grabbed, and so can its points), a shape that is not selected: a pointing hand (a press selects it);
// - a point: an open hand, and it grows a little under the pointer; the dot on an edge: a pointing hand, and it grows (a press adds a point there).
const CURSORS = `
.draw-map .leaflet-container.is-drawing { cursor: crosshair; }
.draw-map .leaflet-container.is-drawing .leaflet-interactive { cursor: crosshair; }
.draw-map .leaflet-container .draw-shape-selected { cursor: grab; }
.draw-map .leaflet-container .draw-shape-selectable { cursor: pointer; }
.draw-map .draw-dot:hover { transform: scale(1.15); }
.draw-map .is-hot .draw-dot { transform: scale(1.5); box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-brand-600) 28%, transparent), var(--shadow-sm) !important; }
.draw-map .draw-point-tip, .draw-map .draw-radius-tip { background: var(--ui-bg-primary); color: var(--ui-text-primary); border-color: var(--ui-border-secondary); box-shadow: var(--shadow-md); }
.draw-map .leaflet-tooltip-top.draw-point-tip::before { border-top-color: var(--ui-bg-primary); }
.draw-map .draw-point-tip { font: 500 12px/16px var(--font-barlow, Barlow, sans-serif); padding: 3px 8px; border-radius: 6px; font-variant-numeric: tabular-nums; }
.draw-map .draw-point-tip b { font-weight: 600; margin-right: 4px; }
.draw-map .draw-tip-line { display: inline-flex; align-items: center; gap: 8px; }
/* With a bubble the tip is a pill, concentric with it: radius 16 = bubble radius 12 + 4 (3px padding and the 1px border). */
.draw-map .draw-point-tip:has(.draw-tip-bubble) { padding: 3px 12px 3px 3px; border-radius: 16px; }
.draw-map .draw-radius-tip { font: 600 12px/16px var(--font-barlow, Barlow, sans-serif); padding: 2px 8px; border-radius: 6px; font-variant-numeric: tabular-nums; }
.draw-map .draw-mid:hover { transform: scale(1.6); opacity: 1; }
.draw-map .draw-edit-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; background: var(--ui-bg-primary); border: 1px solid var(--ui-border-primary); box-shadow: var(--shadow-md); color: var(--ui-text-primary); font: 600 12px/16px var(--font-barlow, Barlow, sans-serif); cursor: pointer; transform: translate(-50%, -50%); white-space: nowrap; opacity: 0; transition: opacity 150ms ease-out; }
.draw-map:hover .draw-edit-chip, .draw-map:focus-within .draw-edit-chip { opacity: 1; }
.draw-map .draw-edit-chip:hover { background: var(--ui-bg-primary_hover); }
/* The chip is 24px tall; its target is 40px (2.16): an invisible box of the chip itself, 8px beyond it above and below. */
.draw-map .draw-edit-chip::after { content: ""; position: absolute; inset: -8px -4px; }
@media (hover: none) { .draw-map .draw-edit-chip { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .draw-map .draw-dot, .draw-map .draw-mid, .draw-map .draw-edit-chip { transition: none !important; } }
`;

export default function DrawMap({ d, className, children, zoomClassName, editAll = false, editChips = false }: { d: Controller; className?: string; children?: React.ReactNode; zoomClassName?: string; /** Every area shows its points and can be edited without selecting it first. */ editAll?: boolean; /** A used area carries an Edit chip (the form's map). */ editChips?: boolean }) {
  return (
    <div className={cx("draw-map relative isolate w-full overflow-hidden rounded-lg border border-secondary", className)}>
      <style>{CURSORS}</style>
      <MapContainer center={d.view?.center ?? SA_CENTER} zoom={d.view?.zoom ?? 6} minZoom={4} maxBounds={SA_MAX_BOUNDS} maxBoundsViscosity={1} zoomControl={false} className="size-full" style={{ background: "var(--color-gray-100)" }}>
        <TileLayer keepBuffer={5} updateWhenIdle={false} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ScaleControl position="bottomleft" imperial={false} />
        <Engine d={d} editAll={editAll} editChips={editChips} />
        <Zoom className={cx("absolute", MAP_CONTROLS_Z_INDEX, zoomClassName ?? "right-3 bottom-8")} />
      </MapContainer>
      {children}
    </div>
  );
}
