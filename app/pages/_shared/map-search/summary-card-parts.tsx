"use client";

import type { ReactNode } from "react";
import { CloseButton } from "@/components/base/buttons/close-button";
import { MAP_SURFACE_RULE } from "@/app/pages/_shared/map-search/map-surface";
import { cx } from "@/utils/cx";

// The two parts every summary card on the map shares (Explore's record peek card, Map visualise's error summary): the close control in the card's top-right corner, and the
// facts as rows. Documented at /patterns/map-list-card.

/** Always the card's top-right corner. Over a photo it is on a solid chip, so it reads on any image; over the plain header it is bare. It is the design system's `CloseButton`
 *  (its hit area, focus ring and press are the component's; it was a hand-built button until 11 Nov 2026), placed and rounded here. `slot={null}`: the card is not a dialog. */
export function SummaryCloseButton({ onClick, onPhoto = false }: { onClick: () => void; onPhoto?: boolean }) {
  return (
    <CloseButton
      size="xs"
      slot={null}
      label="Close summary"
      onPress={onClick}
      className={cx("absolute top-2 right-2 z-10 size-8 rounded-full p-0 hover:bg-secondary", onPhoto && "bg-primary shadow-sm")}
    />
  );
}

/** The facts are rows: the label at the left, the value at the right edge (where a list's status column is), a hairline between the rows in the card's own alpha rule, and one above the first.
 *  The designer chose this from three ways of showing them (23 Oct 2026). */
export function SummaryFacts({ facts, inline = false }: { facts: { label: string; value: ReactNode }[]; inline?: boolean }) {
  // `inline` (the compact card, for a map with little height): the facts side by side, each label over its value, in the same hairline above, so three facts take one row's height instead of three (a fourth wraps to a second row).
  if (inline) {
    return (
      <dl className={cx("m-0 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm", MAP_SURFACE_RULE)}>
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5">
            <dt className="text-tertiary">{fact.label}</dt>
            <dd className="m-0 text-primary">{fact.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cx("m-0 flex flex-col border-t text-sm", MAP_SURFACE_RULE)}>
      {facts.map((fact) => (
        <div key={fact.label} className={cx("flex items-center justify-between gap-4 border-b py-2 last:border-b-0", MAP_SURFACE_RULE)}>
          <dt className="shrink-0 text-tertiary">{fact.label}</dt>
          <dd className="m-0 min-w-0 text-right text-balance text-primary">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
