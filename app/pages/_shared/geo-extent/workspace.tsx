"use client";

// The expanded workspace. Each thing where it is best done: drawing on the map, with the form's own layout (the steps above it, the way on below it:
// `StepMap`), so expanding makes the same thing bigger; the other ways of adding an area, the numbers of the area and the area itself are in the panel
// beside it (a table is easier to read and type in off the map). While a shape waits to be used, adding another way is locked, as the card below it is:
// there is one thing to do, and it is under the map.

import { useEffect } from "react";
import type { Controller } from "@/components/custom/draw-map/use-drawing";
import { cx } from "@/utils/cx";
import { AddMethods } from "./add-methods";
import { AreasPanel } from "./areas-panel";
import { StepMap } from "./step-map";

export function GeoExtentWorkspace({ d }: { d: Controller }) {
  // Every area can be edited where it is, so one is always the one whose numbers are in the table: the first, until another is touched.
  const { select, areas, selected } = d;
  useEffect(() => {
    if (!selected && areas.length > 0) select(areas[0].id);
  }, [selected, areas, select]);
  const waiting = d.pending !== null;
  return (
    // Wide: the map and its steps beside the panel. Narrow: the map takes the height of the screen and the panel is under it, so the whole workspace scrolls
    // and the map is never squeezed to what is left over (on a phone, the steps above and the way on below it left it 97px).
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:overflow-visible">
      <div className="flex h-[max(28rem,calc(100dvh-7rem))] shrink-0 flex-col p-3 lg:h-auto lg:min-h-0 lg:shrink">
        <StepMap d={d} expanded />
      </div>
      <div className="flex min-h-0 flex-col gap-6 border-t border-secondary p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <section aria-label="Add an area" inert={waiting} className={cx("flex flex-col gap-3 transition-opacity duration-150", waiting && "opacity-60")}>
          <h3 className="m-0 text-sm font-semibold text-primary">Add an area</h3>
          <AddMethods d={d} />
        </section>
        <AreasPanel d={d} />
      </div>
    </div>
  );
}
