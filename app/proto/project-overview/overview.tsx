"use client";

// The three Overviews of /proto/project-overview. Each is the whole Overview tab, built as a reflection of Add Project: the same three chapters (its step titles), the
// same names for what was asked, the answers shown the way they were given. They read the same store as the product page (`useEditStore`), so every word is the
// project's own; the people's status is the lab's (`./people`, the product has none yet).
//
// What every option changes from the page, to be confirmed one by one (CONTRACTS 0.4, 4.7):
//   - The three chapters are Add Project's own: Project Identification, Data Collection and Methodology, Privacy and Restrictions, and the blocks are named as its
//     sections are ("Geographic extent", "Focus areas", "Methodology", "Species restrictions"), not "Project details", "Published by", "Focus, species and method".
//   - "Overview" and the lines under each section heading are not drawn: the tab says it (2.12). "Short title" is not a row: it is the page's heading (4.3).
//   - A project manager is a person whose role is Project Manager (16 Oct 2026), so there is no second Project managers list.
//   - A methodology is a list, as it is asked (each with its own note), not one comma string. "Targeted species" is not shown: Add Project no longer asks it.
//   - An answer that was not given is left out, and said once at the foot of its chapter. The coordinates table is a click away (it is the same place, entered another way).
//   - Each restriction is a row (its name and the line Add Project's Review writes for it) that opens to what was entered.
// Editing stays where it is on the product page (each card's Edit opens its form); the lab does not draw those controls because it does not open them.

import { useState, type ReactNode } from "react";
import { ChevronDown, User01, Users01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ListEmptyState } from "@/app/pages/_shared/list-empty-state";
import { useEditStore } from "@/app/pages/project-detail/edit-store";
import { STEP_TITLES } from "@/app/pages/project-registration/option-2/sections";
import { ownersOf, ownerName, type DataOwner } from "@/app/pages/project-registration/types";
import { useFeatureAccess } from "@/lib/use-feature-access";
import { cx } from "@/utils/cx";
import { AbstractBlock, Chapter, Chip, ExtentBlock, FocusBlock, Label, MethodologyBlock, OwnerCard, OwnersOnly, PermitsBlock, RestrictionsBlock } from "./blocks";
import { contentOf } from "./content";
import { countLine, peopleOf, sortPeople, type Person } from "./people";
import { PeoplePanel } from "./people-ui";

const NoOne = () => <ListEmptyState compact icon={User01} title="No one named" description="No one has been named to contact about this project's data." />;

/** One white sheet, as the product page draws its sections. */
function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-8 overflow-clip rounded-xl border border-secondary bg-primary p-8", className)}>{children}</div>;
}

function useOverview(notActive: Set<number>) {
  const { project } = useEditStore();
  const seesPeople = useFeatureAccess("personDetails");
  const owners = ownersOf(project.details);
  return { c: contentOf(project), owners, people: peopleOf(owners, notActive), seesPeople };
}

const ownerLabel = (owners: DataOwner[]) => (owners.length > 1 ? "Data owners" : "Data owner");

/** Every data owner as a card: its primary contact first, the rest a line each. */
function Owners({ owners, people, seesPeople, columns = true }: { owners: DataOwner[]; people: Person[]; seesPeople: boolean; columns?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label>{ownerLabel(owners)}</Label>
      {!seesPeople ? (
        <OwnersOnly owners={owners} />
      ) : people.length === 0 ? (
        <NoOne />
      ) : (
        <div className={cx("grid items-start gap-4", columns && "lg:grid-cols-2")}>
          {owners.map((o) => (
            <OwnerCard key={o.id} owner={o} people={people.filter((p) => p.ownerId === o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The people as a few lines and a dialog: one line per owner (how many, who to contact), "View all" for the directory. */
function OwnerSummary({ owners, people, seesPeople }: { owners: DataOwner[]; people: Person[]; seesPeople: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{ownerLabel(owners)}</Label>
        {seesPeople && people.length > 0 && (
          <Button color="secondary" size="sm" iconLeading={Users01} onClick={() => setOpen(true)}>
            View all
          </Button>
        )}
      </div>
      {!seesPeople ? (
        <OwnersOnly owners={owners} />
      ) : people.length === 0 ? (
        <NoOne />
      ) : (
        <ul className="flex flex-col">
          {owners.map((o) => {
            const mine = sortPeople(people.filter((p) => p.ownerId === o.id));
            if (mine.length === 0) return null;
            const lead = mine.find((p) => p.current);
            return (
              <li key={o.id} className="border-t border-secondary first:border-t-0">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer flex-col gap-1 rounded-lg px-2 py-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-primary">{ownerName(o) || "Individual / Person"}</span>
                    <span className="shrink-0 text-sm text-tertiary">{countLine(mine)}</span>
                  </span>
                  <span className="truncate text-sm text-tertiary">{lead ? [lead.name, lead.role].filter(Boolean).join(", ") : "No one is current"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <PeoplePanel people={people} isOpen={open} onOpenChange={setOpen} />
    </div>
  );
}

// ── 1. Briefing: one column, the three chapters of the flow, everything in view ──

export function BriefingOverview({ notActive }: { notActive: Set<number> }) {
  const { c, owners, people, seesPeople } = useOverview(notActive);
  return (
    <Sheet className="gap-10">
      <Chapter title={STEP_TITLES[1]} first>
        <AbstractBlock c={c} />
        <Owners owners={owners} people={people} seesPeople={seesPeople} />
      </Chapter>
      <Chapter title={STEP_TITLES[2]}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <ExtentBlock c={c} />
          <div className="flex flex-col gap-6">
            <FocusBlock c={c} />
            <PermitsBlock c={c} />
          </div>
        </div>
        <MethodologyBlock c={c} />
      </Chapter>
      <Chapter title={STEP_TITLES[3]}>
        <RestrictionsBlock c={c} />
      </Chapter>
    </Sheet>
  );
}

// ── 2. Map-led: the place stays in view while the chapters scroll beside it ──
// (Drawing the restricted locations on it too was tried: the shared map draws every shape alike, so the extent and the restricted areas cannot be told apart. That is a change to the map component, 1.10, and was not made.)

export function MapLedOverview({ notActive }: { notActive: Set<number> }) {
  const { c, owners, people, seesPeople } = useOverview(notActive);
  return (
    <Sheet>
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <Chapter title={STEP_TITLES[1]} first>
            <AbstractBlock c={c} />
            <Owners owners={owners} people={people} seesPeople={seesPeople} columns={false} />
          </Chapter>
          <Chapter title={STEP_TITLES[2]}>
            <FocusBlock c={c} />
            <MethodologyBlock c={c} />
            <PermitsBlock c={c} />
          </Chapter>
          <Chapter title={STEP_TITLES[3]}>
            <RestrictionsBlock c={c} />
          </Chapter>
        </div>
        <aside aria-label="Geographic extent" className="w-full shrink-0 lg:w-[24rem]">
          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            <ExtentBlock c={c} mapClass="h-80" />
          </div>
        </aside>
      </div>
    </Sheet>
  );
}

// ── 3. Folded: each chapter says its answer while closed and opens to the whole ──

function Peek({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label>{label}</Label>
      <p className="text-sm text-primary">{children}</p>
    </div>
  );
}

function FoldedChapter({ title, peek, defaultOpen = false, children }: { title: string; peek?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-label={title} className="border-t border-secondary pt-6 first:border-t-0 first:pt-0">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-1 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          <span className="text-lg font-semibold text-primary">{title}</span>
          <ChevronDown className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-150", open && "rotate-180")} />
        </button>
      </h2>
      {!open && peek && <div className="pt-3">{peek}</div>}
      {open && <div className="flex flex-col gap-6 pt-5">{children}</div>}
    </section>
  );
}

export function FoldedOverview({ notActive }: { notActive: Set<number> }) {
  const { c, owners, people, seesPeople } = useOverview(notActive);
  const n = c.methodologies.length;
  return (
    <Sheet>
      <FoldedChapter title={STEP_TITLES[1]} defaultOpen>
        <AbstractBlock c={c} />
        <OwnerSummary owners={owners} people={people} seesPeople={seesPeople} />
      </FoldedChapter>
      <FoldedChapter
        title={STEP_TITLES[2]}
        peek={
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <Peek label="Geographic extent">{c.hasExtent ? c.extentText : "Not provided"}</Peek>
            <Peek label="Targeted taxon">{c.taxa.join(", ")}</Peek>
            <Peek label="Methodology">{[c.methodKind, n > 1 ? `${n} methodologies` : n === 1 ? c.methodologies[0].name : ""].filter(Boolean).join(", ") || "Not provided"}</Peek>
          </div>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <ExtentBlock c={c} />
          <div className="flex flex-col gap-6">
            <FocusBlock c={c} />
            <PermitsBlock c={c} />
          </div>
        </div>
        <MethodologyBlock c={c} />
      </FoldedChapter>
      <FoldedChapter
        title={STEP_TITLES[3]}
        peek={
          c.hasRestrictions ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {c.restrictions.map((r) => (
                <Chip key={r.key}>{r.title}</Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary">No restrictions, openly available to every BioData SA user.</p>
          )
        }
      >
        <RestrictionsBlock c={c} />
      </FoldedChapter>
    </Sheet>
  );
}
