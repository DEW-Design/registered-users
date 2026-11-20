"use client";

// The drawing tools as a layer inside a map that is not the draw map: a polygon placed corner by corner and a circle pressed out from its centre, with the numbers beside the
// pointer as it is drawn. It is the same engine and the same controller as the project's geographic extent (`draw-map.tsx`, `use-drawing.ts`), so a person draws the same way
// wherever the product asks for an area (CONTRACTS 0.9, 1.10). The map it sits in owns everything else it shows (Explore draws its search areas, its results and its legend);
// this only draws the one shape being made, and hands it over the moment it is finished: there is no review step here (the designer, 19 Nov 2026: Explore is "draw, search,
// export", "we don't need to add another step in the middle"). The project's extent holds a finished shape for review, because it is data the person must be sure of.
//
// The drawing state lives here, in a child of the map, so moving the pointer re-renders this and not the screen around the map. The screen is told only what it needs to
// draw its own bar (`onState`: the tool and how many points are placed) and given commands (`handleRef`).

import { useEffect, useImperativeHandle, type Ref } from "react";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { CURSORS, Engine } from "./draw-map";
import { useDrawing, type Tool } from "./use-drawing";

export interface DrawLayerHandle {
  /** Start drawing a shape. */
  start: (tool: "circle" | "polygon") => void;
  /** Put down what is being drawn. */
  cancel: () => void;
  /** Take back the last point of a polygon, or the centre of a circle. */
  undo: () => void;
}

export interface DrawLayerState {
  tool: Tool;
  /** Points placed so far (a polygon), or 1 once a circle's centre is set. */
  points: number;
}

export function DrawLayer({ handleRef, onState, onAdd }: { handleRef: Ref<DrawLayerHandle>; onState: (state: DrawLayerState) => void; onAdd: (shape: Boundary) => void }) {
  // `checkFirst` makes a finished shape arrive as `pending`; it is handed over at once and the layer is left empty.
  const d = useDrawing({ checkFirst: true });
  const placed = d.tool === "circle" ? (d.circleCenter ? 1 : 0) : d.points.length;

  useEffect(() => {
    onState({ tool: d.tool, points: placed });
  }, [d.tool, placed, onState]);

  const { pending, discardPending } = d;
  useEffect(() => {
    if (!pending) return;
    onAdd(pending);
    discardPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  useImperativeHandle(handleRef, () => ({
    start: (tool) => d.startTool(tool),
    cancel: () => d.cancel(),
    undo: () => d.undo(),
  }));

  return (
    <>
      <style>{CURSORS}</style>
      <Engine d={d} editAll={false} editChips={false} />
    </>
  );
}
