"use client";

// Variant "On the map". Axis: no chrome beside the map. A small tool column on the map's edge, the instruction and the live numbers in
// a pill at the top while you draw, the pointer's coordinates in a corner, and a card on the map for the shape you select, holding its
// coordinates. The map is the whole interface; the list of areas is a row of chips under it.

import { useState } from "react";
import { Pentagon, Circle, Copy01, Trash01, CheckCircle, XClose, ArrowNarrowLeft, Edit05 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import { areaKm2, coordinatesText, fmtCoord, formatArea, useDrawing, type Controller } from "./drawing";
import { CoordsTable, DrawMap, GoTo, PRECISION_HINT, instruction, liveLine } from "./ui";

export function HudVariant() {
  return <HudWorkspace d={useDrawing()} />;
}

/** The whole "On the map" interface for a controller. `mapClassName` is the map's box (the expanded workspace fills its dialog). */
export function HudWorkspace({ d, mapClassName = "h-[440px]", chips = true, card = true }: { d: Controller; mapClassName?: string; chips?: boolean; card?: boolean }) {
  const sel = d.selected;
  const [copied, setCopied] = useState(false);
  // The coordinates are one press away, so the card does not cover the shape until they are wanted.
  const [editing, setEditing] = useState(false);
  const polygon = d.tool === "polygon";
  const circle = d.tool === "circle";

  return (
    <div className={cx("flex w-full flex-col gap-3", mapClassName.includes("flex-1") && "h-full")}>
      <DrawMap d={d} className={mapClassName} zoomClassName="top-3 right-3">
        {/* Tools, down the left edge. Pressing one again puts it down. */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
          <div className="flex flex-col overflow-hidden rounded-lg border border-secondary bg-primary shadow-md">
            <ButtonUtility
              color="tertiary"
              size="sm"
              icon={Pentagon}
              tooltip="Draw a polygon"
              tooltipPlacement="right"
              aria-label="Draw a polygon"
              aria-pressed={polygon}
              className={cx("size-11 rounded-none", polygon && "bg-brand-primary text-fg-brand-primary")}
              onPress={() => d.startTool(polygon ? null : "polygon")}
            />
            <ButtonUtility
              color="tertiary"
              size="sm"
              icon={Circle}
              tooltip="Draw a circle"
              tooltipPlacement="right"
              aria-label="Draw a circle"
              aria-pressed={circle}
              className={cx("size-11 rounded-none border-t border-secondary", circle && "bg-brand-primary text-fg-brand-primary")}
              onPress={() => d.startTool(circle ? null : "circle")}
            />
          </div>
        </div>

        {/* Go to a place, top centre, away from the tools. */}
        {!d.tool && <GoTo d={d} className="absolute top-3 left-16 z-[1000] w-[min(16rem,calc(100%-6rem))]" />}

        {/* While drawing: what to do, the live numbers, and the three things the keys do. */}
        {d.tool && (
          <div className="absolute top-3 left-16 z-[1000] flex max-w-[calc(100%-5rem)] flex-col gap-1 rounded-xl border border-secondary bg-primary px-3 py-2 shadow-lg">
            <p role="status" className="m-0 text-sm font-medium text-primary">
              {instruction(d)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="m-0 text-sm font-semibold text-primary tabular-nums">{liveLine(d)}</p>
              <span className="flex items-center gap-1">
                <Button color="tertiary" size="sm" iconLeading={ArrowNarrowLeft} isDisabled={polygon ? d.points.length === 0 : !d.circleCenter} onClick={d.undo}>
                  Undo
                </Button>
                <Button color="tertiary" size="sm" iconLeading={XClose} onClick={d.cancel}>
                  Cancel
                </Button>
              </span>
            </div>
          </div>
        )}

        {/* The pointer, in the corner. */}
        <p className="absolute bottom-10 left-3 z-[1000] m-0 rounded-md bg-primary/90 px-2 py-1 text-xs text-secondary tabular-nums shadow-sm" aria-label="Pointer position">
          {d.cursor ? `${fmtCoord(d.cursor[0])}, ${fmtCoord(d.cursor[1])}` : "Pointer"}
        </p>

        {/* A selected shape: its numbers, on the map, beside the shape. */}
        {card && !d.tool && sel && (
          <section aria-label="Selected area" className="absolute right-3 bottom-3 z-[1000] flex max-h-[calc(100%-8rem)] overflow-y-auto w-[min(21rem,calc(100%-1.5rem))] flex-col gap-2 rounded-xl border border-secondary bg-primary p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-primary">{sel.kind === "polygon" ? `Polygon, ${sel.points.length} points` : `Circle, ${sel.radiusKm} km`}</p>
              <p className="m-0 text-xs text-tertiary tabular-nums">{formatArea(areaKm2(sel))}</p>
            </div>
            {editing && <CoordsTable d={d} area={sel} />}
            <div className="flex flex-wrap gap-1">
              <Button
                color="secondary"
                size="sm"
                iconLeading={Copy01}
                onClick={() => {
                  void navigator.clipboard.writeText(coordinatesText(sel));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button color={editing ? "primary" : "secondary"} size="sm" iconLeading={Edit05} aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
                {editing ? "Hide coordinates" : "Edit coordinates"}
              </Button>
              <Button color="secondary" size="sm" iconLeading={Trash01} onClick={() => d.remove(sel.id)}>
                Delete
              </Button>
              <Button color="primary" size="sm" iconLeading={CheckCircle} onClick={() => d.select(null)}>
                Done
              </Button>
            </div>
            {editing && <p className="m-0 text-xs text-balance text-tertiary">{PRECISION_HINT}</p>}
          </section>
        )}
      </DrawMap>

      {chips && (
      <div className="flex min-h-9 flex-wrap items-center gap-2" aria-label="Areas">
        {d.areas.length === 0 ? (
          <p className="m-0 text-sm text-tertiary">Choose a shape on the map, then click to draw.</p>
        ) : (
          d.areas.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={a.id === d.selectedId}
              onClick={() => d.select(a.id === d.selectedId ? null : a.id)}
              className={cx("flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-primary", a.id === d.selectedId ? "border-brand bg-brand-primary" : "border-secondary bg-primary hover:bg-primary_hover")}
            >
              {a.kind === "polygon" ? <Pentagon className="size-4 text-fg-quaternary" aria-hidden /> : <Circle className="size-4 text-fg-quaternary" aria-hidden />}
              {a.kind === "polygon" ? `Polygon ${i + 1}` : `Circle ${i + 1}`}
              <span className="text-xs text-tertiary tabular-nums">{formatArea(areaKm2(a))}</span>
            </button>
          ))
        )}
      </div>
      )}
    </div>
  );
}
