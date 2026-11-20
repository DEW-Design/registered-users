"use client";

// Workspace "Hybrid". Axis: each thing where it is best done. Drawing is done on the map, with the form's own layout (the steps above it, the way on below
// it: `StepMap`), so expanding makes the same thing bigger; the other ways of adding an area, the numbers of the selected shape and the list are in the panel beside it
// (a table is easier to read and type in off the map). Made of "On the map" without its card, and "Split" without its Draw tab.

import { useEffect } from "react";
import { AddMethods } from "../map-drawing/add-methods";
import type { Controller } from "../map-drawing/drawing";
import { AreasPanel } from "./areas-panel";
import { StepMap } from "./step-map";

export function HybridWorkspace({ d, single }: { d: Controller; single: boolean }) {
  // Every area can be edited where it is, so one is always the one whose numbers are in the table: the first, until another is touched.
  const { select, areas, selected } = d;
  useEffect(() => {
    if (!selected && areas.length > 0) select(areas[0].id);
  }, [selected, areas, select]);
  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(18rem,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1">
      <div className="flex min-h-0 flex-col p-3">
        <StepMap d={d} single={single} expanded />
      </div>
      <aside className="flex max-h-[50vh] min-h-0 flex-col gap-6 overflow-y-auto border-t border-secondary p-4 lg:max-h-none lg:border-t-0 lg:border-l">
        <section aria-label="Add an area" className="flex flex-col gap-3">
          <h3 className="m-0 text-sm font-semibold text-primary">Add an area</h3>
          <AddMethods d={d} draw={false} />
        </section>
        <AreasPanel d={d} single={single} />
      </aside>
    </div>
  );
}
