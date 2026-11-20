"use client";

// The map with its steps, as the form shows it and as the expanded workspace shows it: one layout in both, so expanding makes the same thing bigger
// and does not give the person a different set of controls. Above the map, the step you are on, what to do in it, the shape's numbers as facts, and
// the actions of the step; on the map, "go to a place" while choosing and (only where there is something to expand) the Expand button on hover; below
// it, the way on for a shape being checked.

import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { CheckCircle, Edit05, Maximize02, RefreshCcw01, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { MAP_BUTTON_Z_INDEX } from "@/lib/layers";
import { areaKm2, formatArea, polygonAreaKm2, type Controller } from "@/components/custom/draw-map/use-drawing";
import { DrawMap, DrawingActions, GoTo, PointerReadout, ToolButtons, instruction } from "./draw-ui";

type Fact = { label: string; value: string };

/** The numbers of a finished shape, as label and value pairs. */
function factsOf(b: Boundary): Fact[] {
  const shape: Fact = { label: "Shape", value: b.kind === "polygon" ? "Polygon" : "Circle" };
  return b.kind === "polygon"
    ? [shape, { label: "Points", value: String(b.points.length) }, { label: "Area", value: formatArea(areaKm2(b)) }]
    : [shape, { label: "Radius", value: `${b.radiusKm} km` }, { label: "Area", value: formatArea(areaKm2(b)) }];
}

/** The numbers of the shape being drawn, live. */
function liveFacts(d: Controller): Fact[] {
  if (d.tool === "polygon") return [{ label: "Points", value: String(d.points.length) }, ...(d.points.length >= 3 ? [{ label: "Area", value: formatArea(polygonAreaKm2(d.points)) }] : [])];
  if (d.tool === "circle" && d.draftRadiusKm !== null) return [{ label: "Radius", value: `${d.draftRadiusKm} km` }, { label: "Area", value: formatArea(Math.PI * d.draftRadiusKm ** 2) }];
  return [];
}

function Facts({ facts }: { facts: Fact[] }) {
  // One line tall whether or not there is anything to say, so the header does not change size.
  return (
    <dl className="m-0 flex min-h-5 flex-wrap gap-x-5 gap-y-0.5 text-sm tabular-nums">
      {facts.map((f) => (
        <div key={f.label} className="flex gap-1.5">
          <dt className="text-tertiary">{f.label}</dt>
          <dd className="m-0 font-medium text-primary">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StepMap({
  d,
  expanded = false,
  onExpand,
  mapHidden = false,
}: {
  d: Controller;
  /** In the workspace: the map takes the height there is, and the numbers are beside it. */
  expanded?: boolean;
  /** In the form: what the Expand button does. Not given in the workspace, which is already expanded. */
  onExpand?: () => void;
  /** The workspace is open, so its map is the live one; this one is a box of the same size. */
  mapHidden?: boolean;
}) {
  const pending = d.pending;
  const sel = d.selected;
  // choose a shape, draw it, check it (a shape just drawn), or edit one that is already in (selected from the list or the map).
  // In the workspace every area is editable where it is, so there is no "edit" step to enter and leave; in the form a used area is taken back to be checked.
  const step = pending ? "check" : d.tool ? "draw" : sel && !expanded ? "edit" : "choose";
  const heading = d.areas.length === 0 ? "Choose a shape, then draw it on the map." : "Choose a shape to draw a new area. It replaces the one you have.";
  const editing = expanded && step === "choose" && d.areas.length > 0;
  const eyebrow = editing ? "Your areas" : { choose: "Step 1: Choose", draw: "Step 2: Draw", check: "Step 3: Review", edit: "Editing" }[step];
  const line = {
    choose: editing ? "Drag any point to move it, or choose a shape to draw a new area. It replaces the one you have." : heading,
    draw: instruction(d),
    check: "Review the area you drew.",
    edit: expanded ? "Drag a point, or type exact numbers beside the map." : "Drag a point to move it. Exact numbers are in Expand.",
  }[step];
  // The third row is never empty, so the header is the same height, with the same padding above and below, in every step: choosing says what the project has so far.
  const total = d.areas.reduce((n, a) => n + areaKm2(a), 0);
  const have: Fact[] = [{ label: "Area", value: d.areas.length === 0 ? "None yet" : formatArea(total) }];
  const facts = step === "check" && pending ? factsOf(pending) : (step === "edit" || editing) && sel ? factsOf(sel) : step === "draw" ? liveFacts(d) : have;

  return (
    <div className={cx("flex flex-col gap-3", expanded && "h-full min-h-0")}>
      {/* The header keeps its height whatever it says, so the map under it never moves while a shape is drawn. */}
      <div className="flex min-h-[5.5rem] shrink-0 flex-col justify-center gap-3 rounded-lg border border-secondary bg-primary p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="m-0 text-xs font-semibold tracking-wide text-quaternary uppercase">{eyebrow}</p>
          <p role="status" className="m-0 text-sm font-medium text-primary">
            {line}
          </p>
          <Facts facts={facts} />
        </div>
        {step === "choose" && <ToolButtons d={d} className="shrink-0" />}
        {step === "draw" && (
          <div className="shrink-0">
            <DrawingActions d={d} />
          </div>
        )}
        {step === "edit" && sel && (
          <div className="flex shrink-0 gap-2">
            <Button color="secondary" size="sm" iconLeading={Trash01} onClick={() => d.remove(sel.id)}>
              Delete
            </Button>
            <Button color="primary" size="sm" iconLeading={CheckCircle} onClick={() => d.select(null)}>
              Done
            </Button>
          </div>
        )}
      </div>

      {/* The map is always here. While the workspace is open it is the workspace's map that is on screen, so the form's is a box of the same size, not a second map. */}
      <div className={cx("group relative", expanded ? "min-h-0 flex-1" : "h-[440px]")}>
        {mapHidden ? (
          <div className="size-full rounded-lg border border-secondary bg-secondary" aria-hidden />
        ) : (
          <DrawMap d={d} className="size-full" editAll={expanded} editChips={!expanded}>
            {step === "choose" && <GoTo d={d} className="absolute top-3 left-3 z-[1000] w-[min(16rem,calc(100%-6rem))]" />}
            {/* Expand: out of the way until the pointer is over the map (or focus is in it), and always there where there is no pointer to hover with. */}
            {onExpand && (
              <Button
                color="secondary"
                size="sm"
                iconLeading={Maximize02}
                onClick={onExpand}
                className={cx(
                  "absolute top-3 right-3 shadow-md transition-opacity duration-150",
                  MAP_BUTTON_Z_INDEX,
                  "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                )}
              >
                Expand
              </Button>
            )}
          </DrawMap>
        )}
      </div>

      {/* Checking, under the map and not over it, so the shape stays in full view. The way on is on the right and is the one filled button; the ways to change it are beside it. */}
      {step === "check" && pending ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary bg-primary p-3">
          <div className="flex flex-wrap gap-2">
            <Button
              color="secondary"
              size="md"
              iconLeading={RefreshCcw01}
              onClick={() => {
                const again = pending.kind;
                d.discardPending();
                d.startTool(again);
              }}
            >
              Redraw
            </Button>
            {onExpand && (
              <Button color="secondary" size="md" iconLeading={Edit05} onClick={onExpand}>
                Edit coordinates
              </Button>
            )}
          </div>
          <Button color="primary" size="md" iconLeading={CheckCircle} onClick={d.confirmPending}>
            Use this area
          </Button>
        </div>
      ) : (
        <div className="shrink-0">
          <PointerReadout cursor={d.cursor} />
        </div>
      )}
    </div>
  );
}
