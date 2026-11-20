"use client";

// The state of drawing an area, apart from the map that shows it: the tool, the points placed so far, the pointer, the areas, which one is
// selected, and the shape that is waiting to be used (it is checked before it is added). The map engine (draw-map.tsx) reads and writes it; the
// screen puts its own chrome around it (app/pages/_shared/geo-extent). Built in components/** because a map that is drawn on is a behaviour any
// screen could want (CONTRACTS 1.10), with the designer's override (contracts/overrides.json).

import { useCallback, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { haversineDistanceKm, type Boundary } from "@/app/pages/_shared/map-search/geo";

export type LatLon = [number, number];
export type Tool = "polygon" | "circle" | null;

let n = 0;
const newId = () => `draw-${Date.now().toString(36)}-${n++}`;

/** Two clicks of one double-click land on the same spot; the second is not a second point. */
const sameSpot = (a: LatLon, b: LatLon) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/** Area of a polygon on the sphere, in km² (Chamberlain and Duquette). Enough for a readout. */
export function polygonAreaKm2(points: LatLon[]): number {
  if (points.length < 3) return 0;
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    sum += (rad(lon2) - rad(lon1)) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((sum * R * R) / 2);
}

export const areaKm2 = (b: Boundary) => (b.kind === "polygon" ? polygonAreaKm2(b.points) : Math.PI * b.radiusKm * b.radiusKm);

/** Area in km², written for a person: more digits when small. */
export function formatArea(km2: number): string {
  if (km2 >= 1000) return `${Math.round(km2).toLocaleString("en-AU")} km²`;
  if (km2 >= 10) return `${km2.toFixed(0)} km²`;
  return `${km2.toFixed(1)} km²`;
}

/** The corners that bound a shape: a polygon's points, or the box round a circle. */
const extentOf = (b: Boundary): LatLon[] =>
  b.kind === "polygon"
    ? b.points
    : [
        [b.center[0] - b.radiusKm / 111, b.center[1] - b.radiusKm / 90],
        [b.center[0] + b.radiusKm / 111, b.center[1] + b.radiusKm / 90],
      ];

/** The direction from one point to another, in degrees from north (a flat map's reckoning, enough for a handle). */
export function bearingDeg(from: LatLon, to: LatLon): number {
  const dLat = (to[0] - from[0]) * 110.574;
  const dLon = (to[1] - from[1]) * 111.32 * Math.cos((from[0] * Math.PI) / 180);
  return (Math.atan2(dLon, dLat) * 180) / Math.PI;
}

/** The point a distance from a centre in a direction. */
export function pointAt(c: LatLon, km: number, deg: number): LatLon {
  const r = (deg * Math.PI) / 180;
  return [c[0] + (km * Math.cos(r)) / 110.574, c[1] + (km * Math.sin(r)) / (111.32 * Math.cos((c[0] * Math.PI) / 180))];
}

export const fmtCoord = (v: number) => v.toFixed(5);

/** The points of an area, one a line, as the coordinates tool of the product reads them back ("lat, lon"). */
export function coordinatesText(b: Boundary): string {
  if (b.kind === "polygon") return b.points.map(([a, c]) => `${fmtCoord(a)}, ${fmtCoord(c)}`).join("\n");
  return `${fmtCoord(b.center[0])}, ${fmtCoord(b.center[1])} (radius ${b.radiusKm} km)`;
}

export interface Controller {
  areas: Boundary[];
  /** The shape finished but not yet used (the "check it first" flow). Editable like a selected area. */
  pending: Boundary | null;
  selectedId: string | null;
  selected: Boundary | null;
  tool: Tool;
  points: LatLon[];
  circleCenter: LatLon | null;
  cursor: LatLon | null;
  /** The radius the circle would have if the next click finished it. */
  draftRadiusKm: number | null;
  /** Where the map was last looking, so a map made again (the expanded one, or the form's after it) opens on the same view. */
  view: { center: LatLon; zoom: number } | null;
  saveView: (center: LatLon, zoom: number) => void;
  /** The map hands itself over once, so a place can be flown to from outside it. */
  registerMap: (m: LeafletMap | null) => void;
  startTool: (t: Tool) => void;
  addPoint: (p: LatLon) => void;
  circleClick: (p: LatLon) => void;
  /** Set the centre without finishing (the press of a drag-to-draw circle). */
  setCircleCenter: (p: LatLon | null) => void;
  /** The pointer is down on a circle being dragged out. */
  /** The point the pointer is on, in the map or in the table (a polygon's point by its number; a circle's 0 is the centre and 1 the radius), so each shows where the other is. */
  hoverPoint: { areaId: string; index: number } | null;
  setHoverPoint: (p: { areaId: string; index: number } | null) => void;
  circleHeld: boolean;
  setCircleHeld: (b: boolean) => void;
  /** The direction (degrees from north) a circle's radius handle sits in: where it was pulled to, so it does not jump to due east when the drawing ends. */
  bearingOf: (id: string) => number;
  setBearing: (id: string, deg: number) => void;
  finishPolygon: () => void;
  undo: () => void;
  cancel: () => void;
  select: (id: string | null) => void;
  setCursor: (p: LatLon | null) => void;
  update: (id: string, b: Boundary) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  /** Add finished areas from outside the map (a place, pasted coordinates, a file) and select the first. */
  addAreas: (list: Boundary[]) => void;
  /** Put the areas back to a saved list (a Cancel). */
  setAllAreas: (list: Boundary[]) => void;
  confirmPending: () => void;
  /** Take a used shape back to be edited (the "check it first" flow); "Use this area" puts it back. */
  editArea: (id: string) => void;
  discardPending: () => void;
  flyTo: (p: LatLon, zoom?: number) => void;
  fitAreas: () => void;
  /** Bring one shape into view, leaving `bottom` pixels at the foot free (for a sheet over the map). */
  fitShape: (b: Boundary, bottom?: number) => void;
}

export function useDrawing({ checkFirst = false, single = false }: { checkFirst?: boolean; single?: boolean } = {}): Controller {
  const [areas, setAreas] = useState<Boundary[]>([]);
  const [pending, setPending] = useState<Boundary | null>(null);
  // The area taken back to be edited: it goes back where it was if the edit is put down, and is let go of when the edit is used.
  const [original, setOriginal] = useState<Boundary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [points, setPoints] = useState<LatLon[]>([]);
  const [circleCenter, setCircleCenter] = useState<LatLon | null>(null);
  const [circleHeld, setCircleHeld] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{ areaId: string; index: number } | null>(null);
  const [bearings, setBearings] = useState<Record<string, number>>({});
  const [cursor, setCursor] = useState<LatLon | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [view, setView] = useState<{ center: LatLon; zoom: number } | null>(null);

  const reset = () => {
    setTool(null);
    setPoints([]);
    setCircleCenter(null);
    setCircleHeld(false);
  };
  const commit = (b: Boundary) => {
    if (checkFirst) {
      setPending(b);
      setSelectedId(b.id);
    } else {
      // With one area allowed, a new shape takes the place of the one there.
      setAreas((a) => (single ? [b] : [...a, b]));
      setSelectedId(b.id);
    }
    reset();
  };

  const restore = useCallback(() => {
    if (!original) return;
    setAreas((a) => (single ? [original] : a.some((x) => x.id === original.id) ? a : [...a, original]));
    setOriginal(null);
  }, [original, single]);

  const startTool = useCallback(
    (t: Tool) => {
      setPoints([]);
      setCircleCenter(null);
      setPending(null);
      restore();
      setSelectedId(null);
      setTool(t);
    },
    [restore],
  );

  const addPoint = useCallback((p: LatLon) => setPoints((ps) => (ps.length && sameSpot(ps[ps.length - 1], p) ? ps : [...ps, p])), []);

  const finishPolygon = useCallback(() => {
    if (points.length < 3) return;
    commit({ id: newId(), kind: "polygon", points });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, checkFirst]);

  const circleClick = useCallback(
    (p: LatLon) => {
      if (!circleCenter) return setCircleCenter(p);
      const r = Math.max(0.1, Math.round(haversineDistanceKm(circleCenter, p) * 10) / 10);
      const id = newId();
      setBearings((b) => ({ ...b, [id]: bearingDeg(circleCenter, p) }));
      commit({ id, kind: "circle", center: circleCenter, radiusKm: r });
      setCircleHeld(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circleCenter, checkFirst],
  );

  const undo = useCallback(() => {
    if (tool === "polygon") setPoints((ps) => ps.slice(0, -1));
    if (tool === "circle") setCircleCenter(null);
  }, [tool]);

  const cancel = useCallback(() => {
    reset();
    setPending(null);
    restore();
    setSelectedId(null);
  }, [restore]);

  const update = useCallback(
    (id: string, b: Boundary) => {
      if (pending?.id === id) setPending(b);
      else setAreas((all) => all.map((a) => (a.id === id ? b : a)));
    },
    [pending],
  );

  const remove = useCallback((id: string) => {
    setAreas((all) => all.filter((a) => a.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const confirmPendingFn = useCallback(() => {
    if (!pending) return;
    // With one area allowed, the shape that was checked takes the place of the one there.
    setAreas((a) => (single ? [pending] : [...a, pending]));
    setOriginal(null);
    setPending(null);
    setSelectedId(null);
  }, [pending, single]);

  const editArea = useCallback(
    (id: string) => {
      const a = areas.find((x) => x.id === id);
      if (!a) return;
      setAreas((all) => all.filter((x) => x.id !== id));
      setOriginal(a);
      setPending(a);
      setSelectedId(id);
      setTool(null);
    },
    [areas],
  );

  // A slide to the place, not Leaflet's `flyTo`, which zooms out and back in along an arc (the designer, 19 Nov 2026: "I hate the map flyby"). Too far to animate is a cut.
  const flyTo = useCallback((p: LatLon, zoom = 11) => mapRef.current?.setView(p, zoom, { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 0.5 }), []);
  const fitAreas = useCallback(() => {
    const all = pending ? [...areas, pending] : areas;
    const pts: LatLon[] = all.flatMap((b) => (b.kind === "polygon" ? b.points : [b.center]));
    if (pts.length) mapRef.current?.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
  }, [areas, pending]);

  const fitShape = useCallback((b: Boundary, bottom = 40) => {
    mapRef.current?.fitBounds(extentOf(b), { paddingTopLeft: [40, 40], paddingBottomRight: [40, bottom], maxZoom: 14 });
  }, []);

  // A shape waiting to be checked is always the selected one: it cannot be put down by pressing the map, which hid its points and left no way to see how to change it.
  const selected = useMemo(() => pending ?? areas.find((a) => a.id === selectedId) ?? null, [pending, areas, selectedId]);
  const draftRadiusKm = circleCenter && cursor ? Math.round(haversineDistanceKm(circleCenter, cursor) * 10) / 10 : null;

  return {
    areas,
    pending,
    selectedId,
    selected,
    tool,
    points,
    circleCenter,
    cursor,
    draftRadiusKm,
    view,
    saveView: (center, zoom) => setView({ center, zoom }),
    registerMap: (m) => {
      mapRef.current = m;
    },
    startTool,
    addPoint,
    circleClick,
    setCircleCenter,
    circleHeld,
    setCircleHeld,
    hoverPoint,
    setHoverPoint,
    bearingOf: (id) => bearings[id] ?? 90,
    setBearing: (id, deg) => setBearings((b) => ({ ...b, [id]: deg })),
    finishPolygon,
    undo,
    cancel,
    select: (id) => setSelectedId((cur) => (pending ? cur : id)),
    setCursor,
    update,
    remove,
    clearAll: () => (setAreas([]), setPending(null), setSelectedId(null)),
    addAreas: (list) => {
      if (!list.length) return;
      const kept = single ? list.slice(0, 1) : list;
      setAreas((a) => (single ? kept : [...a, ...kept]));
      setSelectedId(kept.length === 1 ? kept[0].id : null);
      // Show everything the project has, not only what was just added: an earlier area must not leave the view when another is added.
      mapRef.current?.fitBounds((single ? kept : [...areas, ...kept]).flatMap(extentOf), { padding: [40, 40], maxZoom: 13 });
    },
    setAllAreas: (list) => (setAreas(list), setPending(null), setOriginal(null), setSelectedId(null), reset()),
    confirmPending: confirmPendingFn,
    editArea,
    discardPending: () => (setPending(null), setSelectedId(null), restore()),
    flyTo,
    fitAreas,
    fitShape,
  };
}
