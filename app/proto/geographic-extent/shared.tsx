"use client";

// Shared pieces of the geographic extent exploration (/proto/geographic-extent): the real map, the real shapefile reader and the real
// Named location list, plus a coordinates parser and the sample data for the worst cases. Nothing here is imported outside `app/proto` (5.4).

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/base/buttons/button";
import { Pentagon, Circle, Trash01, Download01, Copy01 } from "@untitledui/icons";
import { boundarySummary, type Boundary } from "@/app/pages/_shared/map-search/geo";
import { parseShapefileUpload } from "@/app/pages/_shared/map-search/shapefile";
import { cx } from "@/utils/cx";

export type DrawTool = "circle" | "polygon" | null;

const SAMap = dynamic(() => import("@/app/pages/_shared/map-search/sa-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-secondary">
      <p className="text-sm text-tertiary">Loading map…</p>
    </div>
  ),
});

/** The shared map, as the picker draws it: every area at once, a shape drawn with the tool that is on. */
export function AreaMap({
  areas,
  tool,
  onToolChange,
  onAdd,
  highlighted,
  onAreaHover,
  className = "aspect-[5/4]",
}: {
  areas: Boundary[];
  tool: DrawTool;
  onToolChange: (t: DrawTool) => void;
  onAdd: (b: Boundary) => void;
  highlighted?: Set<string>;
  onAreaHover?: (id: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cx("relative isolate w-full overflow-hidden rounded-lg border border-secondary", className)}>
      <SAMap
        boundaries={areas}
        onBoundaryAdd={(b) => {
          onAdd(b);
          onToolChange(null);
        }}
        activeDrawTool={tool}
        onDrawToolChange={onToolChange}
        highlightedBoundaryIds={highlighted}
        onBoundaryHover={onAreaHover}
        className="size-full"
      />
    </div>
  );
}

/** The two draw buttons, as the product's picker has them. */
export function DrawButtons({ tool, onToolChange, className }: { tool: DrawTool; onToolChange: (t: DrawTool) => void; className?: string }) {
  return (
    <div className={cx("flex gap-2", className)}>
      <Button color={tool === "polygon" ? "primary" : "secondary"} size="sm" iconLeading={Pentagon} onClick={() => onToolChange(tool === "polygon" ? null : "polygon")}>
        {tool === "polygon" ? "Drawing…" : "Draw polygon"}
      </Button>
      <Button color={tool === "circle" ? "primary" : "secondary"} size="sm" iconLeading={Circle} onClick={() => onToolChange(tool === "circle" ? null : "circle")}>
        {tool === "circle" ? "Drawing…" : "Draw circle"}
      </Button>
    </div>
  );
}

export const DEFAULT_RADIUS_KM = 25;

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter++}`;

/** One line for an area: what it is and how big, or its name. */
export function areaLine(b: Boundary): string {
  if (b.kind === "polygon") return b.label ? `${b.label}, polygon of ${b.points.length} points` : `Polygon, ${b.points.length} points`;
  return b.label ? boundarySummary(b) : `Circle, ${b.radiusKm} km radius at ${b.center[0].toFixed(3)}, ${b.center[1].toFixed(3)}`;
}

export function AreaIcon({ b, className }: { b: Boundary; className?: string }) {
  const Icon = b.kind === "polygon" ? Pentagon : Circle;
  return <Icon className={cx("size-4 shrink-0 text-fg-quaternary", className)} aria-hidden />;
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={label} onClick={onClick} />;
}

// ── Coordinates ──

/** South Australia's box, as the product's coordinates fields bound it. */
export const SA_LAT: [number, number] = [-38, -25];
export const SA_LON: [number, number] = [129, 141];
export const inSA = (lat: number, lon: number) => lat >= SA_LAT[0] && lat <= SA_LAT[1] && lon >= SA_LON[0] && lon <= SA_LON[1];

export type ParsedCoords = { points: [number, number][]; errors: string[] };

/** Reads pasted coordinates: one point a line, "lat, lon" or "lat lon" (a "lon, lat" pair is turned round when only that way sits inside South Australia). */
export function parseCoordinates(text: string): ParsedCoords {
  const points: [number, number][] = [];
  const errors: string[] = [];
  text
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) return;
      const nums = line.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
      if (!nums || nums.length !== 2) return void errors.push(`Line ${i + 1}: expected a latitude and a longitude`);
      const [a, b] = nums;
      if (inSA(a, b)) points.push([a, b]);
      else if (inSA(b, a)) points.push([b, a]);
      else errors.push(`Line ${i + 1}: ${a}, ${b} is outside South Australia`);
    });
  return { points, errors };
}

/** Whether pasted text is worth reading as coordinates (two or more numbers on a line). */
export const looksLikeCoordinates = (text: string) => /-?\d+\.\d+\s*[,\s]\s*-?\d+\.\d+/.test(text);

// ── Shapefiles ──

/** A file read for real, as the product's picker does, but every polygon and point in it (not only the first). */
export async function readAreas(files: File[], radiusKm = DEFAULT_RADIUS_KM): Promise<{ areas: Boundary[]; name: string; skipped: number }> {
  const layer = await parseShapefileUpload(files);
  const id = newId("shp");
  const areas: Boundary[] = [
    ...layer.polygons.map((points, i): Boundary => ({ id: `${id}-p${i}`, kind: "polygon", points, label: layer.name })),
    ...layer.points.map((center, i): Boundary => ({ id: `${id}-c${i}`, kind: "circle", center, radiusKm, label: layer.name })),
  ];
  return { areas, name: layer.name, skipped: layer.skipped };
}

// ── Sample data for the worst cases (the harness's own, not part of any variant) ──

/** Twelve points round Lake Alexandrina and the Coorong, as a pasted list. */
export const SAMPLE_COORDINATES = [
  "-35.45, 138.80",
  "-35.40, 139.05",
  "-35.50, 139.30",
  "-35.70, 139.40",
  "-35.95, 139.55",
  "-36.20, 139.70",
  "-36.35, 139.60",
  "-36.20, 139.40",
  "-35.95, 139.25",
  "-35.75, 139.05",
  "-35.60, 138.85",
  "-35.50, 138.78",
].join("\n");

const SAMPLE_GEOJSON = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Coorong north" }, geometry: { type: "Polygon", coordinates: [[[139.2, -35.6], [139.5, -35.6], [139.5, -35.9], [139.2, -35.9], [139.2, -35.6]]] } },
    { type: "Feature", properties: { name: "Coorong south" }, geometry: { type: "Polygon", coordinates: [[[139.5, -36.1], [139.8, -36.1], [139.8, -36.4], [139.5, -36.4], [139.5, -36.1]]] } },
    { type: "Feature", properties: { name: "Monitoring site" }, geometry: { type: "Point", coordinates: [138.9, -35.45] } },
  ],
};

/** The harness's own corner: material to test the variants with. */
export function SampleData() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-10 flex max-w-[720px] flex-col gap-3 rounded-xl border border-secondary bg-primary p-4">
      <p className="m-0 text-sm font-semibold text-primary">Test data for this page</p>
      <p className="m-0 text-sm text-tertiary">Not part of any variant. Twelve points round Lake Alexandrina and the Coorong, and a GeoJSON file of two polygons and a point.</p>
      <pre className="m-0 max-h-32 overflow-auto rounded-lg bg-secondary p-3 text-xs text-secondary tabular-nums">{SAMPLE_COORDINATES}</pre>
      <div className="flex flex-wrap gap-2">
        <Button
          color="secondary"
          size="sm"
          iconLeading={Copy01}
          onClick={() => {
            void navigator.clipboard.writeText(SAMPLE_COORDINATES);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy the points"}
        </Button>
        <Button
          color="secondary"
          size="sm"
          iconLeading={Download01}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(SAMPLE_GEOJSON)], { type: "application/geo+json" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "sample-areas.geojson";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download sample-areas.geojson
        </Button>
      </div>
    </div>
  );
}
