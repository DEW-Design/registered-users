"use client";

// The project's geographic extent, "map first". The form shows the map, with the steps of drawing (choose a shape, draw it, review it) above it; over the map, on
// hover (and always on a touch screen, which has no hover), an Expand button opens the workspace on the same map, at the same view, with the same shape part-drawn
// or waiting to be reviewed. In the workspace the panel beside the map adds an area by place, coordinates or file, and holds the area's numbers to edit.
//
// It reads and writes the same `GeoExtentValue` the earlier four-tab picker did (one area): `method` is read back from how the area was made (the id's prefix), so
// the summary, the review and every screen that reads the extent are unchanged.

import { useEffect, useState } from "react";
import { Circle, Edit05, Pentagon, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { areaKm2, formatArea, useDrawing } from "@/components/custom/draw-map/use-drawing";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { emptyGeoExtent, type GeoExtentValue } from "@/app/pages/project-registration/types";
import { useExpandDialog } from "./expand-dialog";
import { StepMap } from "./step-map";
import { GeoExtentWorkspace } from "./workspace";

/** The extent a drawn area makes: how it was made is in its id. */
function extentOf(b: Boundary | null): GeoExtentValue {
  if (!b) return emptyGeoExtent();
  if (b.id.startsWith("list-")) return { method: "list", parkId: b.id.slice("list-".length), listName: b.label, boundary: b };
  if (b.id.startsWith("shp-")) return { method: "shapefile", shapefileName: b.label, boundary: b };
  if (b.id.startsWith("coordinates-")) return { method: "coordinates", boundary: b };
  return { method: "map", boundary: b };
}

const keyOf = (b: Boundary | null | undefined) => JSON.stringify(b ?? null);

export function GeoExtentMapFirst({ value, onChange }: { value: GeoExtentValue; onChange: (value: GeoExtentValue) => void }) {
  const d = useDrawing({ checkFirst: true, single: true });
  const { open, start, dialog } = useExpandDialog({ d, workspace: (dd) => <GeoExtentWorkspace d={dd} /> });
  const { pending, areas, setAllAreas } = d;

  // The value is the truth and the drawing mirrors it. A change from outside (the sample content, a saved extent loaded) is taken in; a change made here is
  // handed out. While a shape waits to be reviewed it is in neither: the value keeps the area it had until the new one is used.
  const valueKey = keyOf(value.boundary);
  const areaKey = keyOf(areas[0]);
  const [lastValueKey, setLastValueKey] = useState<string | null>(null);
  if (!pending && valueKey !== lastValueKey) {
    setLastValueKey(valueKey);
    if (valueKey !== areaKey) setAllAreas(value.boundary ? [value.boundary] : []);
  }
  useEffect(() => {
    if (pending || areaKey === valueKey) return;
    onChange(extentOf(areas[0] ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaKey, pending]);

  // A shape that has just been finished is framed on the map, so the whole of it is seen while it is reviewed.
  const { fitShape } = d;
  const pendingId = pending?.id;
  useEffect(() => {
    if (pending && !open) fitShape(pending, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <div className="flex w-full flex-col gap-3">
      <StepMap d={d} onExpand={start} mapHidden={open} />

      {areas.length > 0 && (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-secondary bg-primary p-0" aria-label="Area used">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-secondary px-3 py-1.5 last:border-b-0">
              {a.kind === "polygon" ? <Pentagon className="size-4 shrink-0 text-fg-quaternary" aria-hidden /> : <Circle className="size-4 shrink-0 text-fg-quaternary" aria-hidden />}
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{a.label ?? (a.kind === "polygon" ? `Polygon, ${a.points.length} points` : `Circle, ${a.radiusKm} km`)}</span>
              <span className="text-xs text-tertiary tabular-nums">{formatArea(areaKm2(a))}</span>
              <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label="Edit the area" onClick={() => (d.editArea(a.id), d.fitShape(a, 40))}>
                Edit
              </Button>
              <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label="Remove the area" onClick={() => d.remove(a.id)} />
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
