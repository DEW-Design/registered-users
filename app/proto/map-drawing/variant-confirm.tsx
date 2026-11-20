"use client";

// Variant "Check it first". Axis: committing. Drawing and using are two steps. A shape you finish is not added yet: it waits, dashed, with a
// sheet over the foot of the map that shows its coordinates (editable, and the points drag), and two clear ways on: Redraw, or Use this area.
// Nothing is added by accident, and the numbers are looked at once, at the moment they matter.

import { useEffect } from "react";
import { Pentagon, Circle, Trash01, CheckCircle, RefreshCcw01, Edit05 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { areaKm2, formatArea, useDrawing } from "./drawing";
import { CoordsTable, DrawMap, DrawingActions, GoTo, PRECISION_HINT, PointerReadout, ToolButtons, instruction, liveLine } from "./ui";

export function ConfirmVariant() {
  const d = useDrawing({ checkFirst: true });
  const pending = d.pending;
  const step = pending ? "check" : d.tool ? "draw" : "choose";
  const { fitShape } = d;
  const pendingId = pending?.id;
  // The sheet covers the foot of the map, so a new shape is brought into the part that is left (once, when it is finished; not while its points are dragged).
  useEffect(() => {
    if (pending) fitShape(pending, 230);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <div className="flex w-full flex-col gap-3">
      {/* The job, above the map: which step you are on, and what is on offer in it. */}
      {/* The header keeps its height whatever it says (two lines of text fit), so the map under it never moves while a shape is drawn. */}
      <div className="flex min-h-[4.75rem] flex-col justify-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="m-0 text-xs font-semibold tracking-wide text-quaternary uppercase">{step === "choose" ? "Step 1: Choose" : step === "draw" ? "Step 2: Draw" : "Step 3: Review"}</p>
          <p role="status" className="m-0 text-sm font-medium text-primary">
            {step === "choose" && "What shape is the area?"}
            {step === "draw" && `${instruction(d)} ${liveLine(d) ? `(${liveLine(d)})` : ""}`}
            {step === "check" && pending && `${pending.kind === "polygon" ? `Polygon, ${pending.points.length} points` : `Circle, ${pending.radiusKm} km`}, ${formatArea(areaKm2(pending))}. Review the coordinates.`}
          </p>
        </div>
        {step === "choose" && <ToolButtons d={d} className="shrink-0" />}
        {step === "draw" && <div className="shrink-0"><DrawingActions d={d} /></div>}
      </div>

      <DrawMap d={d} className="h-[440px]">
        {step === "choose" && <GoTo d={d} className="absolute top-3 left-3 z-[1000] w-[min(16rem,calc(100%-6rem))]" />}
        {step === "check" && pending && (
          <section aria-label="Review the area" className="absolute inset-x-3 bottom-3 z-[1000] flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-3 shadow-lg">
            <CoordsTable d={d} area={pending} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 min-w-0 flex-1 text-xs text-balance text-tertiary">{PRECISION_HINT}</p>
              <div className="flex gap-2">
                <Button
                  color="secondary"
                  size="sm"
                  iconLeading={RefreshCcw01}
                  onClick={() => {
                    const again = pending.kind;
                    d.discardPending();
                    d.startTool(again);
                  }}
                >
                  Redraw
                </Button>
                <Button color="primary" size="sm" iconLeading={CheckCircle} onClick={d.confirmPending}>
                  Use this area
                </Button>
              </div>
            </div>
          </section>
        )}
      </DrawMap>

      <div className="flex items-center justify-between gap-3">
        <PointerReadout cursor={d.cursor} />
      </div>

      {d.areas.length > 0 && (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-secondary bg-primary p-0" aria-label="Areas used">
          {d.areas.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-secondary px-3 py-1.5 last:border-b-0">
              {a.kind === "polygon" ? <Pentagon className="size-4 shrink-0 text-fg-quaternary" aria-hidden /> : <Circle className="size-4 shrink-0 text-fg-quaternary" aria-hidden />}
              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                {a.kind === "polygon" ? `Polygon ${i + 1}, ${a.points.length} points` : `Circle ${i + 1}, ${a.radiusKm} km`}
              </span>
              <span className="text-xs text-tertiary tabular-nums">{formatArea(areaKm2(a))}</span>
              <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label={`Edit area ${i + 1}`} onClick={() => (d.editArea(a.id), d.fitShape(a, 230))}>
                Edit
              </Button>
              <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Remove area ${i + 1}`} onClick={() => d.remove(a.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
