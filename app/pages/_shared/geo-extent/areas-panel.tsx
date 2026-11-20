"use client";

// The workspace's panel, below the ways of adding an area: the area there is, and editing it inside its own card. One card is open at a time (the one in the
// table); a shape that has just been drawn is the first card, waiting to be used ("Not added yet"). The card in edit mode has the brand border and halo the
// project page's cards have (4.8). A project holds one area, so a new one takes the place of the one there.

import { useState } from "react";
import { ArrowLeft, Circle, MarkerPin01, Pentagon, Trash01 } from "@untitledui/icons";
import { ListEmptyState } from "@/app/pages/_shared/list-empty-state";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { DestructiveModal } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { areaKm2, formatArea, type Controller } from "@/components/custom/draw-map/use-drawing";
import { CoordsTable } from "./draw-ui";

/** What an area is called in the list, and what it is in a line. */
function describe(b: Boundary, i: number): { name: string; line: string } {
  const name = b.label ?? (b.kind === "polygon" ? `Polygon ${i + 1}` : `Circle ${i + 1}`);
  const line = b.kind === "polygon" ? `${b.points.length} points, ${formatArea(areaKm2(b))}` : `${b.radiusKm} km radius, ${formatArea(areaKm2(b))}`;
  return { name, line };
}

function AreaCard({ d, b, i, waiting = false }: { d: Controller; b: Boundary; i: number; waiting?: boolean }) {
  // The open card is the one being edited: the shape waiting to be used, or else the one selected.
  const [asking, setAsking] = useState(false);
  const open = waiting || d.selectedId === b.id;
  const locked = !!d.pending && !waiting;
  const { name, line } = describe(b, i);
  const Icon = b.kind === "polygon" ? Pentagon : Circle;
  return (
    <li
      className={cx(
        "flex flex-col rounded-xl border bg-primary transition-shadow duration-150",
        // The card being edited: the brand border and halo (4.8). A shape waiting to be used is dashed until it is.
        open ? "border-[var(--color-brand-500)] ring-4 ring-[var(--color-brand-50)]" : "border-secondary",
        waiting && !open && "border-dashed",
      )}
    >
      <div className="flex items-center gap-1 p-1.5 pr-2">
        <button
          type="button"
          aria-expanded={open}
          disabled={locked || waiting}
          className={cx("flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-focus-ring focus-visible:outline-2", locked && "opacity-60", locked || waiting ? "cursor-default" : "hover:bg-primary_hover")}
          onClick={() => {
            if (!waiting) {
              d.select(b.id);
              d.fitShape(b, 40);
            }
          }}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-secondary bg-secondary">
            <Icon className="size-4 text-fg-quaternary" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-primary">{waiting ? `New ${b.kind}` : name}</span>
            <span className="truncate text-xs text-tertiary tabular-nums">{waiting ? `Not added yet, ${line}` : line}</span>
          </span>
        </button>
        {waiting ? (
          <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Discard new ${b.kind}`} onClick={() => setAsking(true)} />
        ) : (
          <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Remove ${name}`} onClick={() => d.remove(b.id)} />
        )}
      </div>
      {waiting && (
        <DestructiveModal
          isOpen={asking}
          onOpenChange={setAsking}
          confirmIcon={Trash01}
          cancelIcon={ArrowLeft}
          title={`Discard this new ${b.kind}?`}
          description="It has not been added yet, so it will be lost."
          confirmLabel="Discard"
          cancelLabel="Cancel & keep editing"
          footerLayout="column"
          onConfirm={d.discardPending}
        />
      )}
      {open && (
        <div className="flex flex-col gap-2 border-t border-secondary p-3">
          <CoordsTable d={d} area={b} />
          <p className="m-0 text-xs text-balance text-tertiary">Up and down nudge a number by about a metre (Shift: ten).</p>
        </div>
      )}
    </li>
  );
}

export function AreasPanel({ d }: { d: Controller }) {
  const count = d.areas.length;
  return (
    <section aria-label="Area" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="m-0 text-sm font-semibold text-primary">Area</h3>
      </div>
      <p className="m-0 text-xs text-tertiary">A project has one area. Adding another replaces it.</p>
      {count === 0 && !d.pending ? (
        <ListEmptyState icon={MarkerPin01} title="No area yet" description="Choose a shape above the map and draw it, or add a place, coordinates or a file with the tabs above." compact />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {d.pending && <AreaCard d={d} b={d.pending} i={count} waiting />}
          {d.areas.map((a, i) => (
            <AreaCard key={a.id} d={d} b={a} i={i} />
          ))}
        </ul>
      )}
    </section>
  );
}
