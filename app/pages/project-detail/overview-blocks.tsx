"use client";

// The blocks of the Overview, one per kind of answer Add Project takes (the designer, 19 Nov 2026, from the Folded option of /proto/project-overview): a place (the extent), a short list (focus
// areas), a list with a note each (methodologies), facts (permit numbers), and a state with a row per kind (restrictions), in chapters that fold. What a person typed is shown the way it was typed: a
// list is a list. Each chapter is Add Project's own step title and says its answer while it is closed; the whole closed chapter is the thing to press, not its title alone.
//
// Type is the page's own: a chapter is the Section heading (18px 600), a label is "Targeted taxon" (12px 600, uppercase, tracked, quaternary), a value is 14px primary, a note 14px tertiary.

import { useState, type ReactNode } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { EmbeddedTable } from "@/app/pages/_shared/embedded-table";
import { LocationDetailsTable } from "@/app/pages/_shared/location-details-table";
import { ExpandableMap } from "@/app/pages/_shared/map-search/expandable-map";
import { cx } from "@/utils/cx";
import type { Content, RestrictionItem } from "./overview-content";
import { Label, SECTION_LABEL } from "./people-summary";

// ── A chapter that folds ──

/** A chapter of the Overview. Closed it is one pressable block, its title and the answer it holds (`peek`) together, so the whole of it opens the chapter; open, its title is the toggle and what is in it follows. `mounted` is
 *  whether it has been opened once: its content is drawn from then on and only hidden while closed, so a card being edited in it keeps its draft. */
export function FoldedChapter({
  id,
  title,
  peek,
  note,
  open,
  mounted,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  /** What the chapter holds, in a line or three, shown while it is closed. Text only: it sits inside the button that opens the chapter. */
  peek?: ReactNode;
  /** Beside the title while it is closed (a card that needs details). */
  note?: ReactNode;
  open: boolean;
  mounted: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  const peekId = `${id}-peek`;
  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-4 border-t border-secondary px-6 py-5 first:border-t-0">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-labelledby={titleId}
          aria-describedby={!open && peek ? peekId : undefined}
          onClick={onToggle}
          className={cx(
            "-mx-3 flex w-[calc(100%+1.5rem)] cursor-pointer flex-col gap-3 rounded-lg px-3 py-2 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2",
          )}
        >
          <span className="flex w-full items-center justify-between gap-4">
            <span id={titleId} className="flex items-center gap-2 text-lg font-semibold text-primary">
              {title}
              {!open && note}
            </span>
            <ChevronDown className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-150", open && "rotate-180")} />
          </span>
          {!open && peek && (
            <span id={peekId} className="block w-full">
              {peek}
            </span>
          )}
        </button>
      </h2>
      {mounted && (
        <div inert={!open} className={cx("flex flex-col gap-6 pt-5", !open && "hidden")}>
          {children}
        </div>
      )}
    </section>
  );
}

/** One answer in a closed chapter's line: its label, then the value. Spans, because it sits inside a button. */
export function Peek({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className={SECTION_LABEL}>{label}</span>
      <span className="text-sm text-primary">{children}</span>
    </span>
  );
}

/** The label above the map: a row as tall as the card's edit icon, which sits at the block's top right, so the icon is beside the label and not over the map's zoom buttons. */
const Head = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-8 items-center">
    <Label>{children}</Label>
  </div>
);

/** A short answer as a chip: the page's own (12px 500, a rounded outline). */
export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-2.5 py-1 text-xs font-medium text-secondary">{children}</span>
);

/** A link-style fold: "Show coordinates". */
function FoldButton({ open, onToggle, show, hide }: { open: boolean; onToggle: () => void; show: string; hide: string }) {
  return (
    <Button color="link-gray" size="sm" iconTrailing={ChevronDown} aria-expanded={open} onClick={onToggle} className="self-start">
      {open ? hide : show}
    </Button>
  );
}

// ── A place ──

export function ExtentBlock({ c, mapClass = "h-64" }: { c: Content; mapClass?: string }) {
  const [coords, setCoords] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Head>Geographic extent</Head>
      {c.boundary && (
        <div className={cx("overflow-hidden rounded-xl border border-secondary", mapClass)}>
          <ExpandableMap title="Geographic extent" boundaries={[{ ...c.boundary, id: "project-extent" }]} onBoundaryAdd={() => {}} activeDrawTool={null} onDrawToolChange={() => {}} className="size-full" />
        </div>
      )}
      <p className="text-sm text-primary">{c.extentText}</p>
      {c.centre && (
        <>
          <FoldButton open={coords} onToggle={() => setCoords((o) => !o)} show="Show coordinates" hide="Hide coordinates" />
          {coords && <LocationDetailsTable lat={c.centre[0]} lon={c.centre[1]} />}
        </>
      )}
    </div>
  );
}

// ── Short lists and facts ──

export function TaxonBlock({ c }: { c: Content }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>Targeted taxon</Label>
      {c.taxa.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {c.taxa.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      ) : (
        <p className="text-sm text-quaternary">Not provided</p>
      )}
    </div>
  );
}

/** The permit numbers of the project's datasets, rolled up. They are entered on a dataset, so this is a read-only line, shown only when there is one. */
export function PermitNumbersBlock({ c }: { c: Content }) {
  if (c.permitNumbers.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>{c.permitNumbers.length > 1 ? "Permit numbers" : "Permit number"}</Label>
      <p className="text-sm text-primary">{c.permitNumbers.join(", ")}</p>
    </div>
  );
}

// ── Methodology: the kind, then each methodology with its own note ──

export function MethodologyBlock({ c }: { c: Content }) {
  const hasNotes = c.methodologies.some((m) => m.note);
  const rows = c.methodologies.map((m, i) => ({ id: String(i), ...m }));
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label>Methodology</Label>
      {c.methodKind ? <p className="text-sm font-medium text-primary">{c.methodKind}</p> : <p className="text-sm text-quaternary">Not provided</p>}
      {rows.length > 1 || hasNotes ? (
        <EmbeddedTable
          ariaLabel="Methodologies"
          columns={[
            { id: "name", label: "Methodology", isRowHeader: true, className: hasNotes ? "w-[40%]" : "w-full" },
            ...(hasNotes ? [{ id: "note", label: "Variations, limitations and biases", className: "w-[60%]" }] : []),
          ]}
          rows={rows}
          cell={(r, col) => (col === "name" ? <span className="text-primary">{r.name}</span> : r.note)}
          minWidth="min-w-[420px]"
        />
      ) : (
        rows.length === 1 && <p className="text-sm text-primary">{rows[0].name}</p>
      )}
      {c.legacy && (
        <div className="flex max-w-prose flex-col gap-3 text-sm">
          {c.legacy.methodology && <p className="text-primary">{c.legacy.methodology}</p>}
          {c.legacy.limitations && (
            <div className="flex flex-col gap-1">
              <Label>Variations, limitations and biases</Label>
              <p className="text-primary">{c.legacy.limitations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── A restriction: its name and the line Add Project's Review writes for it, opening to what was entered ──

/** `reserve` leaves room at the end of the row for the card's edit and remove icons. */
export function RestrictionRow({ item, reserve }: { item: RestrictionItem; reserve: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx("flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2", reserve && "pr-24")}
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-primary">{item.title}</span>
          <span className={cx("text-sm text-tertiary", !open && "line-clamp-2")}>{item.summary}</span>
        </span>
        <ChevronDown className={cx("mt-0.5 size-4 shrink-0 text-fg-quaternary transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && item.facts.length > 0 && (
        <dl className="flex flex-col gap-2 border-t border-secondary px-4 py-4 pl-11">
          {item.facts.map((f, i) => (
            <div key={`${f.label}${i}`} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
              <dt className="text-sm text-tertiary">{f.label}</dt>
              <dd className="max-w-prose text-sm text-primary">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
