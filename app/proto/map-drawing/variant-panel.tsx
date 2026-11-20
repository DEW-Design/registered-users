"use client";

// Variant "Panel". Axis: where the numbers live. A panel beside the map (floating over it on a wide screen, under it on a phone) always says
// where you are in the job: choosing a shape, drawing (the points fill the table as you click), or looking at a shape (the same table, editable).

import { Plus, Trash01, CheckCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { areaKm2, formatArea, useDrawing } from "./drawing";
import { CoordsTable, DrawMap, DrawingActions, GoTo, LivePoints, PRECISION_HINT, PointerReadout, ToolButtons, instruction, liveLine, useWide } from "./ui";

export function PanelVariant() {
  const d = useDrawing();
  const sel = d.selected;
  const wide = useWide();

  const panel = (
<section
          aria-label="Area"
          className={cx(
            "flex flex-col gap-3 bg-primary p-3",
            // Over the map where there is room (it covers the left 18rem); under it on a phone, so the map can be drawn on.
            wide ? "absolute top-3 left-3 z-[1000] max-h-[calc(100%-1.5rem)] w-72 overflow-y-auto rounded-xl border border-secondary shadow-lg" : "rounded-lg border border-secondary",
          )}
        >
          <GoTo d={d} />
          {d.tool ? (
            <>
              <div className="flex flex-col gap-1">
                <p className="m-0 text-sm font-semibold text-primary">{d.tool === "polygon" ? "Drawing a polygon" : "Drawing a circle"}</p>
                <p role="status" className="m-0 text-sm text-balance text-tertiary">
                  {instruction(d)}
                </p>
                <p className="m-0 text-sm font-medium text-primary tabular-nums">{liveLine(d)}</p>
              </div>
              <LivePoints d={d} />
              <DrawingActions d={d} />
            </>
          ) : sel ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-sm font-semibold text-primary">{sel.kind === "polygon" ? `Polygon, ${sel.points.length} points` : "Circle"}</p>
                <p className="m-0 text-xs text-tertiary tabular-nums">{formatArea(areaKm2(sel))}</p>
              </div>
              <CoordsTable d={d} area={sel} />
              <p className="m-0 text-xs text-balance text-tertiary">{PRECISION_HINT}</p>
              <div className="flex gap-2">
                <Button color="primary" size="sm" iconLeading={CheckCircle} onClick={() => d.select(null)}>
                  Done
                </Button>
                <Button color="secondary" size="sm" iconLeading={Trash01} onClick={() => d.remove(sel.id)}>
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="m-0 text-sm font-semibold text-primary">Add an area</p>
                <ToolButtons d={d} />
              </div>
              {d.areas.length === 0 ? (
                <p className="m-0 text-sm text-balance text-tertiary">Pick a shape, then click the map. Go to a place first to get close.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0" aria-label="Areas">
                  {d.areas.map((a, i) => (
                    <li key={a.id}>
                      <button type="button" className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-primary_hover" onClick={() => d.select(a.id)}>
                        <span>{a.kind === "polygon" ? `Polygon ${i + 1}` : `Circle ${i + 1}`}</span>
                        <span className="text-xs text-tertiary tabular-nums">{formatArea(areaKm2(a))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <DrawMap d={d} className="h-[440px]">
        {wide && panel}
      </DrawMap>
      {!wide && panel}
      <div className="flex items-center justify-between gap-3">
        <PointerReadout cursor={d.cursor} />
        {d.areas.length > 0 && !d.tool && (
          <div className="flex gap-2">
            <Button color="tertiary" size="sm" iconLeading={Plus} onClick={() => d.startTool("polygon")}>
              Add another
            </Button>
            <Button color="tertiary" size="sm" onClick={d.fitAreas}>
              Show all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
