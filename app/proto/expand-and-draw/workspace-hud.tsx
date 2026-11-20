"use client";

// Workspace "On the map". Axis: the map is the whole window. The tools, the instruction with its live numbers, the pointer and the card of the selected
// shape are all on the map; the areas are a row of chips under it. The same interface as /proto/map-drawing's "On the map", given the room.

import type { Controller } from "../map-drawing/drawing";
import { HudWorkspace } from "../map-drawing/variant-hud";

export function HudFull({ d }: { d: Controller }) {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <HudWorkspace d={d} mapClassName="min-h-0 flex-1" />
    </div>
  );
}
