"use client";

// Variant "Coordinates grid". Axis: data first. The area is a table of coordinates you can type, paste by the dozen or fill by drawing,
// and the map is the live preview of the table. As a polygon (three or more points) or as separate points, each with a radius.

import { useMemo, useState } from "react";
import { Plus, Pentagon, ClipboardCheck } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { InputNumber } from "@/components/base/input/input-number";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioGroup, RadioButton } from "@/components/base/radio-buttons/radio-buttons";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { AreaMap, DEFAULT_RADIUS_KM, RemoveButton, SA_LAT, SA_LON, inSA, newId, parseCoordinates, type DrawTool } from "./shared";

type Row = { id: string; lat: string; lon: string };
type Mode = "polygon" | "points";

const emptyRow = (): Row => ({ id: newId("row"), lat: "", lon: "" });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function GridVariant() {
  const [mode, setMode] = useState<Mode>("polygon");
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM);
  const [tool, setTool] = useState<DrawTool>(null);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);

  const parsedPaste = useMemo(() => parseCoordinates(paste), [paste]);
  const valid = (r: Row) => {
    const a = num(r.lat);
    const b = num(r.lon);
    return Number.isFinite(a) && Number.isFinite(b) && inSA(a, b);
  };
  const filled = (r: Row) => r.lat.trim() !== "" || r.lon.trim() !== "";
  const goodRows = rows.filter(valid);

  // What the map shows, from the table.
  const areas: Boundary[] = useMemo(() => {
    if (mode === "polygon") {
      return goodRows.length >= 3 ? [{ id: "grid-polygon", kind: "polygon", points: goodRows.map((r) => [num(r.lat), num(r.lon)] as [number, number]) }] : [];
    }
    return goodRows.map((r): Boundary => ({ id: r.id, kind: "circle", center: [num(r.lat), num(r.lon)], radiusKm: radius }));
  }, [mode, goodRows, radius]);

  const setRow = (id: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const blur = (id: string) => setTouched((t) => new Set(t).add(id));
  const fromPoints = (pts: [number, number][]): Row[] => pts.map(([a, b]) => ({ id: newId("row"), lat: String(a), lon: String(b) }));
  const dropEmpty = (all: Row[]) => all.filter(filled);

  const status =
    mode === "polygon"
      ? goodRows.length >= 3
        ? `Polygon of ${goodRows.length} points`
        : `${goodRows.length} of 3 points needed for a polygon`
      : `${goodRows.length} ${goodRows.length === 1 ? "point" : "points"}, ${radius} km radius each`;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <RadioGroup aria-label="What the coordinates are" orientation="horizontal" className="gap-6" value={mode} onChange={(v) => setMode(v as Mode)}>
          <RadioButton value="polygon" label="One area (polygon)" />
          <RadioButton value="points" label="Separate points" />
        </RadioGroup>
        {mode === "points" && <InputNumber aria-label="Radius in kilometres" label="Radius (km)" className="w-32" value={radius} minValue={1} maxValue={300} step={5} onChange={setRadius} />}
      </div>

      <div className="overflow-hidden rounded-lg border border-secondary bg-primary">
        <div className="grid grid-cols-[2.25rem_1fr_1fr_2.5rem] items-center gap-x-3 border-b border-secondary bg-secondary px-3 py-2 text-xs font-semibold text-tertiary">
          <span className="tabular-nums">#</span>
          <span>Latitude</span>
          <span>Longitude</span>
          <span />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {rows.map((r, i) => {
            const bad = touched.has(r.id) && filled(r) && !valid(r);
            return (
              <div
                key={r.id}
                className="grid grid-cols-[2.25rem_1fr_1fr_2.5rem] items-start gap-x-3 border-b border-secondary px-3 py-1.5 last:border-b-0"
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                data-hover={hover === r.id ? "" : undefined}
              >
                <span className="pt-2.5 text-sm text-tertiary tabular-nums">{i + 1}</span>
                <Input aria-label={`Latitude of point ${i + 1}`} size="sm" placeholder="-34.93" inputMode="decimal" value={r.lat} isInvalid={bad} onChange={(v) => setRow(r.id, { lat: v })} onBlur={() => blur(r.id)} />
                <Input aria-label={`Longitude of point ${i + 1}`} size="sm" placeholder="138.60" inputMode="decimal" value={r.lon} isInvalid={bad} onChange={(v) => setRow(r.id, { lon: v })} onBlur={() => blur(r.id)} />
                <RemoveButton label={`Remove point ${i + 1}`} onClick={() => setRows((all) => (all.length > 1 ? all.filter((x) => x.id !== r.id) : [emptyRow()]))} />
                {bad && (
                  <p className="col-span-4 m-0 pb-1 pl-[3.25rem] text-xs text-error-primary">
                    Latitude {SA_LAT[0]} to {SA_LAT[1]} and longitude {SA_LON[0]} to {SA_LON[1]}, which is South Australia.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-secondary bg-secondary px-3 py-2">
          <Button color="secondary" size="sm" iconLeading={Plus} onClick={() => setRows((all) => [...all, emptyRow()])}>
            Add point
          </Button>
          <Button color="secondary" size="sm" iconLeading={ClipboardCheck} onClick={() => setShowPaste((s) => !s)}>
            {showPaste ? "Close paste" : "Paste a list"}
          </Button>
          <Button
            color={tool === "polygon" ? "primary" : "secondary"}
            size="sm"
            iconLeading={Pentagon}
            onClick={() => setTool(tool === "polygon" ? null : "polygon")}
          >
            {tool === "polygon" ? "Drawing…" : "Fill by drawing"}
          </Button>
          {rows.some(filled) && (
            <Button color="tertiary" size="sm" className="ml-auto" onClick={() => (setRows([emptyRow(), emptyRow(), emptyRow()]), setTouched(new Set()))}>
              Clear table
            </Button>
          )}
        </div>
      </div>

      {showPaste && (
        <div className="flex flex-col gap-2 rounded-lg border border-secondary bg-primary p-3">
          <TextArea
            label="Coordinates, one point a line"
            placeholder={"-35.45, 138.80\n-35.40, 139.05"}
            rows={5}
            value={paste}
            onChange={setPaste}
            isInvalid={parsedPaste.errors.length > 0 && paste.trim() !== ""}
            hint={
              paste.trim() === ""
                ? "Latitude, then longitude, separated by a comma or a space."
                : parsedPaste.errors.length
                  ? parsedPaste.errors.slice(0, 3).join(" ") + (parsedPaste.errors.length > 3 ? ` And ${parsedPaste.errors.length - 3} more.` : "")
                  : `${parsedPaste.points.length} points found.`
            }
          />
          <div className="flex gap-2">
            <Button
              color="primary"
              size="sm"
              iconLeading={Plus}
              isDisabled={parsedPaste.points.length === 0}
              onClick={() => {
                setRows((all) => [...dropEmpty(all), ...fromPoints(parsedPaste.points)]);
                setPaste("");
                setShowPaste(false);
              }}
            >
              Add {parsedPaste.points.length || ""} {parsedPaste.points.length === 1 ? "point" : "points"}
            </Button>
          </div>
        </div>
      )}

      <AreaMap
        areas={areas}
        tool={tool}
        onToolChange={setTool}
        onAdd={(b) => {
          // A drawn polygon fills the table with its corners; a drawn circle adds its centre.
          if (b.kind === "polygon") setRows(fromPoints(b.points.map(([a, c]) => [Math.round(a * 1e5) / 1e5, Math.round(c * 1e5) / 1e5] as [number, number])));
          else setRows((all) => [...dropEmpty(all), ...fromPoints([[Math.round(b.center[0] * 1e5) / 1e5, Math.round(b.center[1] * 1e5) / 1e5]])]);
          if (b.kind === "polygon") setMode("polygon");
        }}
        highlighted={hover ? new Set([hover]) : undefined}
      />
      <p role="status" className="m-0 text-sm font-medium text-primary tabular-nums">
        {status}
      </p>
    </div>
  );
}
