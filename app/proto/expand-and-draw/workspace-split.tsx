"use client";

// Workspace "Split". Axis: a notebook beside the map. The map has the room; the panel beside it (under it on a narrow window) is where the job is done:
// add an area by any of four methods, then see and fix the numbers of the one selected, and the list of every area.

import { AddMethods } from "../map-drawing/add-methods";
import type { Controller } from "../map-drawing/drawing";
import { DrawMap, PointerChip } from "../map-drawing/ui";
import { AreasPanel } from "./areas-panel";

export function SplitWorkspace({ d, single }: { d: Controller; single: boolean }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(16rem,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1">
      <div className="min-h-0 p-3">
        <DrawMap d={d} className="h-full" zoomClassName="top-3 right-3">
          <PointerChip cursor={d.cursor} />
        </DrawMap>
      </div>
      <aside className="flex max-h-[55vh] min-h-0 flex-col gap-6 overflow-y-auto border-t border-secondary p-4 lg:max-h-none lg:border-t-0 lg:border-l">
        <section aria-label="Add an area" className="flex flex-col gap-3">
          <h3 className="m-0 text-sm font-semibold text-primary">Add an area</h3>
          <AddMethods d={d} />
        </section>
        <AreasPanel d={d} single={single} />
      </aside>
    </div>
  );
}
