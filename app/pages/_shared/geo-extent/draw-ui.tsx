"use client";

// The pieces the map-first picker is made of that are not the map: the lazy map, the line that says what to do next, the tool buttons, the coordinates
// table (typed values and the dragged handles are the same numbers, and the pointer on one shows the other), and "go to a place".

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Pentagon, Circle, ArrowNarrowLeft, Check, XClose, Trash01, MarkerPin01, SearchLg } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { findListedLocation, useLocationList } from "@/app/pages/_shared/map-search/location-list";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { cx } from "@/utils/cx";
import { NumberBubble } from "@/components/custom/draw-map/number-bubble";
import { fmtCoord, type Controller, type LatLon } from "@/components/custom/draw-map/use-drawing";

export const DrawMap = dynamic(() => import("@/components/custom/draw-map/draw-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center rounded-lg border border-secondary bg-secondary">
      <p className="text-sm text-tertiary">Loading map…</p>
    </div>
  ),
});

/** What to do next, from where the drawing is. Said where the person is looking. */
export function instruction(d: Controller): string {
  if (d.tool === "polygon") {
    if (d.points.length === 0) return "Click the map to place the first point.";
    if (d.points.length < 3) return `${d.points.length} ${d.points.length === 1 ? "point" : "points"}. Keep clicking to add more.`;
    return "Click the first point, double-click or press Enter to finish.";
  }
  if (d.tool === "circle") return d.circleHeld ? "Let go when it is the size you want." : d.circleCenter ? "Move out to the size you want, then click to finish." : "Press for the centre and drag out to the size you want.";
  return "";
}

export function ToolButtons({ d, className }: { d: Controller; className?: string }) {
  return (
    <div className={cx("flex flex-wrap gap-2", className)} role="group" aria-label="Shape to draw">
      <Button color={d.tool === "polygon" ? "primary" : "secondary"} size="sm" iconLeading={Pentagon} onClick={() => d.startTool(d.tool === "polygon" ? null : "polygon")}>
        Add a polygon
      </Button>
      <Button color={d.tool === "circle" ? "primary" : "secondary"} size="sm" iconLeading={Circle} onClick={() => d.startTool(d.tool === "circle" ? null : "circle")}>
        Add a circle
      </Button>
    </div>
  );
}

export function DrawingActions({ d }: { d: Controller }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button color="secondary" size="sm" iconLeading={ArrowNarrowLeft} isDisabled={d.tool === "polygon" ? d.points.length === 0 : !d.circleCenter} onClick={d.undo}>
        Undo
      </Button>
      <Button color="secondary" size="sm" iconLeading={XClose} onClick={d.cancel}>
        Cancel
      </Button>
      {d.tool === "polygon" && (
        <Button color="primary" size="sm" iconLeading={Check} isDisabled={d.points.length < 3} onClick={d.finishPolygon}>
          Finish
        </Button>
      )}
    </div>
  );
}

export function PointerReadout({ cursor, className }: { cursor: LatLon | null; className?: string }) {
  return (
    <p className={cx("m-0 text-xs text-secondary tabular-nums", className)} aria-label="Pointer position">
      {cursor ? `${fmtCoord(cursor[0])}, ${fmtCoord(cursor[1])}` : "Move over the map for coordinates"}
    </p>
  );
}

/** One number of a coordinate. It keeps what is being typed and takes it (or goes back) when you leave it, so a half-typed "-3" is not an error. */
function CoordInput({ label, value, onCommit, min, max, step = 1e-5, className }: { label: string; value: number; onCommit: (v: number) => void; min: number; max: number; step?: number; className?: string }) {
  const [text, setText] = useState(fmtCoord(value));
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(fmtCoord(value));
  }, [value]);
  const bad = text.trim() !== "" && (!Number.isFinite(Number(text)) || Number(text) < min || Number(text) > max);
  return (
    <Input
      aria-label={label}
      size="sm"
      inputMode="decimal"
      inputClassName="px-2! text-sm! tabular-nums"
      value={text}
      isInvalid={bad}
      className={className}
      onFocus={() => (editing.current = true)}
      // Up and down nudge the number: by `step` (about a metre for a coordinate), ten times that with Shift.
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const base = Number.isFinite(Number(text)) && text.trim() !== "" ? Number(text) : value;
        const next = Math.min(max, Math.max(min, Math.round((base + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1)) * 1e6) / 1e6));
        setText(fmtCoord(next));
        onCommit(next);
      }}
      onChange={(v) => {
        setText(v);
        const n = Number(v);
        if (v.trim() !== "" && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => {
        editing.current = false;
        setText(fmtCoord(value));
      }}
    />
  );
}

const LAT: [number, number] = [-38, -25];
const LON: [number, number] = [129, 141];

/** Hovering or focusing a row (or the fields of a circle) lights the point on the map, and the point lights the row: the pointer on either shows the other. */
const linkTo = (d: Controller, areaId: string, index: number) => ({
  onMouseEnter: () => d.setHoverPoint({ areaId, index }),
  onMouseLeave: () => d.setHoverPoint(null),
  onFocus: () => d.setHoverPoint({ areaId, index }),
  onBlur: () => d.setHoverPoint(null),
});

/** The numbers of the selected area, editable. A polygon is a table of points; a circle is a centre and a radius. */
export function CoordsTable({ d, area, className }: { d: Controller; area: Boundary; className?: string }) {
  if (area.kind === "circle") {
    return (
      <div className={cx("grid grid-cols-3 gap-2", className)}>
        <label className="flex flex-col gap-1 text-xs text-tertiary" {...linkTo(d, area.id, 0)}>
          Latitude
          <CoordInput label="Centre latitude" value={area.center[0]} min={LAT[0]} max={LAT[1]} onCommit={(v) => d.update(area.id, { ...area, center: [v, area.center[1]] })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tertiary" {...linkTo(d, area.id, 0)}>
          Longitude
          <CoordInput label="Centre longitude" value={area.center[1]} min={LON[0]} max={LON[1]} onCommit={(v) => d.update(area.id, { ...area, center: [area.center[0], v] })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tertiary" {...linkTo(d, area.id, 1)}>
          Radius (km)
          <CoordInput label="Radius in kilometres" value={area.radiusKm} min={0.1} max={300} step={0.1} onCommit={(v) => d.update(area.id, { ...area, radiusKm: v })} />
        </label>
      </div>
    );
  }
  return (
    <div className={cx("overflow-hidden rounded-lg border border-secondary bg-primary", className)}>
      <div className="grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-x-1.5 border-b border-secondary bg-secondary px-2 py-1.5 text-xs font-semibold text-tertiary">
        <span>#</span>
        <span>Latitude</span>
        <span>Longitude</span>
        <span />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {area.points.map((p, i) => (
          <div
            key={i}
            {...linkTo(d, area.id, i)}
            className={cx(
              "grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-x-1.5 border-b border-secondary px-2 py-1 transition-colors duration-100 last:border-b-0",
              d.hoverPoint?.areaId === area.id && d.hoverPoint.index === i && "bg-brand-primary",
            )}
          >
            <NumberBubble n={i + 1} />
            <CoordInput label={`Latitude of point ${i + 1}`} value={p[0]} min={LAT[0]} max={LAT[1]} onCommit={(v) => d.update(area.id, { ...area, points: area.points.map((q, j) => (j === i ? [v, q[1]] : q)) })} />
            <CoordInput label={`Longitude of point ${i + 1}`} value={p[1]} min={LON[0]} max={LON[1]} onCommit={(v) => d.update(area.id, { ...area, points: area.points.map((q, j) => (j === i ? [q[0], v] : q)) })} />
            <Button
              color="tertiary"
              size="sm"
              iconLeading={Trash01}
              aria-label={`Remove point ${i + 1}`}
              isDisabled={area.points.length <= 3}
              onClick={() => d.update(area.id, { ...area, points: area.points.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Go to a place before drawing, so the map is close enough to draw on: a place from the list, or "lat, lon". */
export function GoTo({ d, className }: { d: Controller; className?: string }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const locations = useLocationList();
  const q = text.trim().toLowerCase();
  const coords = useMemo(() => {
    const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    return m ? ([Number(m[1]), Number(m[2])] as LatLon) : null;
  }, [text]);
  const places = useMemo(() => (q && !coords ? locations.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 5) : []), [q, coords, locations]);

  return (
    <div className={cx("relative", className)}>
      <Input aria-label="Go to a place or coordinates" size="sm" icon={SearchLg} placeholder="Go to a place or coordinates" value={text} onChange={(v) => (setText(v), setOpen(true))} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (coords || places.length > 0) && (
        <ul className="absolute top-full right-0 left-0 z-[1100] m-0 mt-1 flex list-none flex-col overflow-hidden rounded-lg border border-secondary bg-primary p-0 shadow-lg">
          {coords && (
            <li>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary_hover" onMouseDown={(e) => (e.preventDefault(), d.flyTo(coords, 12), setText(""))}>
                <MarkerPin01 className="size-4 text-fg-quaternary" aria-hidden /> Go to {fmtCoord(coords[0])}, {fmtCoord(coords[1])}
              </button>
            </li>
          )}
          {places.map((p) => {
            const place = findListedLocation(locations, p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!place?.center}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary_hover disabled:opacity-50"
                  onMouseDown={(e) => (e.preventDefault(), place?.center && (d.flyTo(place.center, 11), setText("")))}
                >
                  <MarkerPin01 className="size-4 text-fg-quaternary" aria-hidden /> {p.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
