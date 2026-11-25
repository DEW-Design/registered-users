"use client";

// The blocks the Overview options are built from, one per kind of answer Add Project takes: prose (the abstract), people (a data owner and its officers), a place (the
// extent), a short list (focus areas), a list with a note each (methodologies), facts (permits), and a state with a row per kind (restrictions). What a person typed
// is shown the way it was typed: a sentence as a sentence, a list as a list. Type is from the page's own treatments: a label is "Focus areas" (12px 600, uppercase,
// tracked, quaternary), a name is the owner's name (14px 500, primary), the rest 14px (tertiary, or primary for a value).

import { useState, type ReactNode } from "react";
import { ChevronDown } from "@untitledui/icons";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { LocationDetailsTable } from "@/app/pages/_shared/location-details-table";
import { ExpandableMap } from "@/app/pages/_shared/map-search/expandable-map";
import { EmbeddedTable } from "@/app/pages/_shared/embedded-table";
import { ownerName, type DataOwner } from "@/app/pages/project-registration/types";
import { cx } from "@/utils/cx";
import type { Content, RestrictionItem } from "./content";
import { sortPeople, type Person } from "./people";
import { ContactLines, FoldButton, PersonRow, SECTION_LABEL, StatusBadge, useFold } from "./people-ui";

export const Label = ({ children }: { children: ReactNode }) => <p className={SECTION_LABEL}>{children}</p>;

/** A chapter of the Overview: Add Project's step title, then what was given in it. */
export function Chapter({ title, first = false, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} className={cx("flex min-w-0 flex-col gap-6", !first && "border-t border-secondary pt-8")}>
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

const NotProvided = ({ items }: { items: string[] }) => (items.length > 0 ? <p className="text-sm text-quaternary">{`Not provided: ${items.join(", ")}`}</p> : null);

export { NotProvided };

// ── Prose ──

export function AbstractBlock({ c }: { c: Content }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {c.fullTitle && (
        <div className="flex flex-col gap-2">
          <Label>Full title</Label>
          <p className="text-sm font-medium text-primary">{c.fullTitle}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label>Abstract</Label>
        {c.abstract ? <p className="max-w-prose text-sm text-pretty text-primary">{c.abstract}</p> : <p className="text-sm text-quaternary">Not provided</p>}
      </div>
    </div>
  );
}

// ── People ──

/** A data owner: its primary contact leads, the other officers are one line each, the ones who are not active fold. */
export function OwnerCard({ owner, people }: { owner: DataOwner; people: Person[] }) {
  const sorted = sortPeople(people);
  const current = sorted.filter((p) => p.current);
  const away = sorted.filter((p) => !p.current);
  const lead = current[0];
  const others = current.slice(1);
  // An owner with no one current has nothing to show but the ones who are not: start with them open.
  const [open, toggle] = useFold(current.length === 0 && away.length > 0);
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-secondary bg-primary p-5">
      <h4 className="text-sm font-medium text-primary">{ownerName(owner) || "Individual / Person"}</h4>
      {lead ? (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          <Label>{lead.primary ? "Primary contact" : "Contact"}</Label>
          <div className="flex items-start justify-between gap-3">
            <AvatarLabelGroup size="md" initials={lead.initials} title={lead.name} subtitle={lead.role || "No role given"} />
            <StatusBadge current />
          </div>
          <ContactLines person={lead} />
        </div>
      ) : (
        <p className="border-t border-secondary pt-4 text-sm text-tertiary">{people.length === 0 ? "No one named." : "No one is current on this owner."}</p>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          <Label>Other project officers</Label>
          <ul className="flex flex-col gap-3">
            {others.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        </div>
      )}
      {away.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          {current.length > 0 && <FoldButton open={open} onToggle={toggle} show={`Show ${away.length} not active`} hide="Hide not active" />}
          {open && (
            <ul className="flex flex-col gap-3">
              {away.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** What a role without person details sees: the data owner's name and no one in it (the DEW privacy standard, 11 Nov 2026). */
export function OwnersOnly({ owners }: { owners: DataOwner[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {owners.map((o) => (
        <li key={o.id} className="text-sm font-medium text-primary">
          {ownerName(o) || "Individual / Person"}
        </li>
      ))}
    </ul>
  );
}

// ── A place ──

export function ExtentBlock({ c, mapClass = "h-64", fixedLabel = true }: { c: Content; mapClass?: string; fixedLabel?: boolean }) {
  const [coords, toggle] = useFold();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {fixedLabel && <Label>Geographic extent</Label>}
      {c.hasExtent ? (
        <>
          {c.boundary && (
            <div className={cx("overflow-hidden rounded-xl border border-secondary", mapClass)}>
              <ExpandableMap title="Geographic extent" boundaries={[{ ...c.boundary, id: "project-extent" }]} onBoundaryAdd={() => {}} activeDrawTool={null} onDrawToolChange={() => {}} className="size-full" />
            </div>
          )}
          <p className="text-sm text-primary">{c.extentText}</p>
          {c.centre && (
            <>
              <FoldButton open={coords} onToggle={toggle} show="Show coordinates" hide="Hide coordinates" />
              {coords && <LocationDetailsTable lat={c.centre[0]} lon={c.centre[1]} />}
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-quaternary">Not provided</p>
      )}
    </div>
  );
}

// ── Short lists and facts ──

/** A short answer as a chip: the page's own (12px 500, a rounded outline). */
export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-2.5 py-1 text-xs font-medium text-secondary">{children}</span>
);

export function FocusBlock({ c }: { c: Content }) {
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

/** The permit numbers of the project's datasets, rolled up (read only: they are entered on a dataset). Nothing when there is none. */
export function PermitsBlock({ c }: { c: Content }) {
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
      {c.methodKind && <p className="text-sm font-medium text-primary">{c.methodKind}</p>}
      {rows.length > 1 || hasNotes ? (
        <EmbeddedTable
          ariaLabel="Methodologies"
          columns={[
            { id: "name", label: "Methodology", isRowHeader: true, className: hasNotes ? "w-[40%]" : "w-full" },
            ...(hasNotes ? [{ id: "note", label: "Variations, limitations and biases", className: "w-[60%]" }] : []),
          ]}
          rows={rows}
          cell={(r, col) => (col === "name" ? <span className="text-primary">{r.name}</span> : r.note)}
          minWidth="min-w-[520px]"
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

// ── Restrictions: the state, then a row per kind that opens to what was entered ──

function RestrictionRow({ item, defaultOpen = false }: { item: RestrictionItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = item.icon;
  return (
    <li className="border-t border-secondary first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-primary">{item.title}</span>
          <span className={cx("text-sm text-tertiary", !open && "line-clamp-2")}>{item.summary}</span>
        </span>
        <ChevronDown className={cx("mt-0.5 size-4 shrink-0 text-fg-quaternary transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && item.facts.length > 0 && (
        <dl className="flex flex-col gap-2 pr-4 pb-4 pl-11">
          {item.facts.map((f, i) => (
            <div key={`${f.label}${i}`} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
              <dt className="text-sm text-tertiary">{f.label}</dt>
              <dd className="max-w-prose text-sm text-primary">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function RestrictionsBlock({ c }: { c: Content }) {
  if (!c.hasRestrictions) return <p className="text-sm text-primary">No restrictions, openly available to every BioData SA user.</p>;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm text-primary">{c.restrictions.length === 1 ? "One kind of restriction applies." : `${c.restrictions.length} kinds of restriction apply.`}</p>
      <ul className="overflow-hidden rounded-xl border border-secondary bg-primary">
        {c.restrictions.map((r) => (
          <RestrictionRow key={r.key} item={r} />
        ))}
      </ul>
    </div>
  );
}
