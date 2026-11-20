"use client";

// "Map first". The form shows the map by default, with the steps of "check it first" (choose a shape, draw it, check it, use it). Over the map, on hover
// (and always on a touch screen, which has no hover), an Expand button; it opens the Hybrid workspace on the same map, at the same view, with the same shape
// part-drawn or waiting to be checked. Checking a shape inline is a look at the whole shape and its numbers in a line; exact coordinates are edited in the
// expanded workspace, where the table is beside the map and does not hide the shape. Not product (5.4).

import { useEffect } from "react";
import { Circle, Edit05, Pentagon, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { areaKm2, formatArea, useDrawing } from "../map-drawing/drawing";
import { StepMap } from "./step-map";
import { useExpandDialog } from "./expand-dialog";
import type { LabConfig } from "./lab-controls";
import { HybridWorkspace } from "./workspace-hybrid";

export function MapFirst({ config }: { config: LabConfig }) {
  const single = config.areas === "one";
  const d = useDrawing({ checkFirst: true, single });
  const { open, start, dialog } = useExpandDialog({ d, config, workspace: (dd) => <HybridWorkspace d={dd} single={single} /> });
  const pending = d.pending;

  // A shape that has just been finished is framed on the map, so the whole of it is seen while it is checked.
  const { fitShape } = d;
  const pendingId = pending?.id;
  useEffect(() => {
    if (pending && !open) fitShape(pending, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <div className="flex w-full flex-col gap-3">
      <StepMap d={d} single={single} onExpand={start} mapHidden={open} />

      {d.areas.length > 0 && (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-secondary bg-primary p-0" aria-label="Areas used">
          {d.areas.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-secondary px-3 py-1.5 last:border-b-0">
              {a.kind === "polygon" ? <Pentagon className="size-4 shrink-0 text-fg-quaternary" aria-hidden /> : <Circle className="size-4 shrink-0 text-fg-quaternary" aria-hidden />}
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{a.label ?? (a.kind === "polygon" ? `Polygon ${i + 1}, ${a.points.length} points` : `Circle ${i + 1}, ${a.radiusKm} km`)}</span>
              <span className="text-xs text-tertiary tabular-nums">{formatArea(areaKm2(a))}</span>
              <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label={`Edit area ${i + 1}`} onClick={() => (d.editArea(a.id), d.fitShape(a, 40))}>
                Edit
              </Button>
              <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Remove area ${i + 1}`} onClick={() => d.remove(a.id)} />
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
