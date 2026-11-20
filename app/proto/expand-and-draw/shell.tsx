"use client";

// "Expand and draw". The form holds a summary of the area and one button; the drawing is done in a workspace that takes the whole window, where the
// map has room for the numbers beside it. Cancel puts the areas back as they were; "Use these areas" keeps them. The workspace is a render function, so
// each variant of /proto/expand-and-draw is only its own workspace. Not product (5.4).

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Maximize02, Edit05, MarkerPin01, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { areaKm2, formatArea, useDrawing, type Controller } from "../map-drawing/drawing";
import { useExpandDialog } from "./expand-dialog";
import type { LabConfig } from "./lab-controls";


// A still picture of the areas: the product's map, fitted to them, that cannot be pressed.
const PreviewMap = dynamic(() => import("@/app/pages/_shared/map-search/sa-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-secondary" />,
});

function Summary({ d, onExpand, single }: { d: Controller; onExpand: () => void; single: boolean }) {
  const polygons = d.areas.filter((a) => a.kind === "polygon").length;
  const circles = d.areas.length - polygons;
  const total = d.areas.reduce((n, a) => n + areaKm2(a), 0);
  if (d.areas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-secondary bg-primary p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-secondary bg-secondary">
            <MarkerPin01 className="size-5 text-fg-quaternary" aria-hidden />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold text-primary">No area yet</p>
            <p className="m-0 text-sm text-tertiary">Draw it, choose a place, paste coordinates or upload a file.</p>
          </div>
        </div>
        <Button color="primary" size="md" iconLeading={Maximize02} onClick={onExpand}>
          Expand and draw
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-3">
      <div className="relative isolate h-48 overflow-hidden rounded-lg border border-secondary">
        <PreviewMap boundaries={d.areas} onBoundaryAdd={() => {}} activeDrawTool={null} onDrawToolChange={() => {}} showZoomControls={false} className="size-full" />
        {/* Not a map to press: the way to change it is the button. */}
        <div className="absolute inset-0 z-[1000]" aria-hidden />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-primary tabular-nums">
            {d.areas.length} {d.areas.length === 1 ? "area" : "areas"}
          </p>
          <p className="m-0 text-sm text-tertiary tabular-nums">
            {[polygons ? `${polygons} ${polygons === 1 ? "polygon" : "polygons"}` : null, circles ? `${circles} ${circles === 1 ? "circle" : "circles"}` : null].filter(Boolean).join(", ")}, about {formatArea(total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button color="tertiary" size="sm" iconLeading={Trash01} onClick={d.clearAll}>
            {single ? "Remove" : "Remove all"}
          </Button>
          <Button color="secondary" size="md" iconLeading={Edit05} onClick={onExpand}>
            Expand and edit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExpandAndDraw({ workspace, config }: { workspace: (d: Controller) => ReactNode; config: LabConfig }) {
  const single = config.areas === "one";
  const d = useDrawing({ single });
  const { start, dialog } = useExpandDialog({ d, config, workspace });
  return (
    <>
      <Summary d={d} onExpand={start} single={single} />
      {dialog}
    </>
  );
}
