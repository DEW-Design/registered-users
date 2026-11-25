"use client";

// The four ways /proto/project-owners shows data owners and their project officers for a project that has several owners and many officers. The first two keep the
// accordion the page already uses for its sections (compact variant, a title with a line of what is inside it, a chevron): an owner is a row that opens to its people.
// They differ in what is inside: a line per officer, or the officers' names with a card on press. The third answers "who do I contact" in a table of owners and keeps the
// officers behind a dialog; the fourth is one directory of every officer with the product's own search and filter. Principles (CONTRACTS 0.10): 6 Reveal in steps (the
// answer first, the many behind a click), 2 One thing first (the primary contact of each owner), 7 Design every state (one owner and three officers, five owners and forty,
// none current, none named, a role that sees no people), 3 One system (the page's accordion, its embedded table, its search and Filter, the design system's popover).
// Status is the lab's (`../project-overview/people`), the product has none yet.

import { useMemo, useState, type Key, type ReactNode } from "react";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger } from "react-aria-components";
import { ChevronRight, User01 } from "@untitledui/icons";
import { Accordion } from "@/components/base/accordion/accordion";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { CountBadge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Popover } from "@/components/base/select/popover";
import { AttributeFilterChips, useAttributeFilter, type Attribute } from "@/app/pages/_shared/attribute-filter";
import { EmbeddedTable } from "@/app/pages/_shared/embedded-table";
import { FilterMenu } from "@/app/pages/_shared/filter-menu";
import { ListEmptyState } from "@/app/pages/_shared/list-empty-state";
import { ToolbarSearch } from "@/app/pages/_shared/toolbar-search";
import { ownerName, type DataOwner } from "@/app/pages/project-registration/types";
import { cx } from "@/utils/cx";
import { Label, OwnersOnly } from "../project-overview/blocks";
import { countLine, sortPeople, type Person } from "../project-overview/people";
import { ContactLines, FoldButton, PeopleDirectory, PeoplePanel, PersonRow, PrimaryBadge, StatusBadge, useFold } from "../project-overview/people-ui";

export interface OwnersProps {
  owners: DataOwner[];
  people: Person[];
  seesPeople: boolean;
}

const nameOf = (o: DataOwner) => ownerName(o) || "Individual / Person";
const mineOf = (people: Person[], o: DataOwner) => sortPeople(people.filter((p) => p.ownerId === o.id));
const leadOf = (mine: Person[]) => mine.find((p) => p.current);
const nameAndRole = (p: Person) => [p.name, p.role].filter(Boolean).join(", ");
/** Officers listed under an owner before "Show N more": a list that grows with the data is bounded (CONTRACTS 4.2d). */
const LIMIT = 6;

const NoOne = () => <ListEmptyState compact icon={User01} title="No one named" description="No one has been named to contact about this project's data." />;

/** The primary contact of an owner: the one thing to read first. */
function LeadBlock({ lead }: { lead: Person }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>{lead.primary ? "Primary contact" : "Contact"}</Label>
      <div className="flex items-start justify-between gap-3">
        <AvatarLabelGroup size="md" initials={lead.initials} title={lead.name} subtitle={lead.role || "No role given"} />
        <StatusBadge current />
      </div>
      <ContactLines person={lead} />
    </div>
  );
}

// ── The accordion of owners, shared by options 1 and 2 ──

function OwnerAccordions({ owners, people, roster }: { owners: DataOwner[]; people: Person[]; roster: (mine: Person[]) => ReactNode }) {
  // The first owner starts open, as the page's first section does; with more than two owners there is a way to open or close every one.
  const [open, setOpen] = useState<Set<Key>>(new Set(owners[0] ? [owners[0].id] : []));
  const allOpen = open.size === owners.length;
  const items = owners.map((o) => {
    const mine = mineOf(people, o);
    const lead = leadOf(mine);
    return {
      id: o.id,
      title: (
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            {nameOf(o)}
            {mine.length > 0 && <CountBadge count={mine.length} color="gray" />}
          </span>
          {/* Said once: while the owner is open its contact is the first thing inside it. */}
          {!open.has(o.id) && (
            <span className="text-sm font-normal text-tertiary">{lead ? `${lead.primary ? "Primary contact" : "Contact"}: ${nameAndRole(lead)}` : mine.length === 0 ? "No one named" : "No one is current"}</span>
          )}
        </span>
      ),
      action: mine.length > 0 ? <span className="text-sm text-tertiary">{countLine(mine)}</span> : undefined,
      content: <div className="flex flex-col gap-5 pt-2 pb-2">{roster(mine)}</div>,
    };
  });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {owners.length > 2 && (
        <div className="flex justify-end">
          <Button color="link-gray" size="sm" onClick={() => setOpen(allOpen ? new Set() : new Set(owners.map((o) => o.id)))}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      )}
      <div className="rounded-xl border border-secondary bg-primary px-4">
        <Accordion variant="compact" actionPlacement="beforeChevron" visibleWhenOpen openKeys={open} onOpenKeysChange={setOpen} items={items} />
      </div>
    </div>
  );
}

/** Splits an owner's people into the contact, the other current officers and the ones who are not active. */
function split(mine: Person[]) {
  const current = mine.filter((p) => p.current);
  return { lead: current[0], others: current.slice(1), away: mine.filter((p) => !p.current) };
}

// ── 1. Accordions, a line per officer ──

function RowsRoster({ mine }: { mine: Person[] }) {
  const { lead, others, away } = split(mine);
  const [all, toggleAll] = useFold();
  const [showAway, toggleAway] = useFold(!lead && away.length > 0);
  const shown = all ? others : others.slice(0, LIMIT);
  return (
    <>
      {lead ? <LeadBlock lead={lead} /> : <p className="text-sm text-tertiary">{mine.length === 0 ? "No one named." : "No one is current on this owner."}</p>}
      {others.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          <Label>{`Other project officers (${others.length})`}</Label>
          <ul className="flex flex-col gap-3">
            {shown.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
          {others.length > LIMIT && <FoldButton open={all} onToggle={toggleAll} show={`Show ${others.length - LIMIT} more`} hide="Show fewer" />}
        </div>
      )}
      {away.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          {lead && <FoldButton open={showAway} onToggle={toggleAway} show={`Show ${away.length} not active`} hide="Hide not active" />}
          {showAway && (
            <ul className="flex flex-col gap-3">
              {away.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

export function AccordionRows({ owners, people, seesPeople }: OwnersProps) {
  if (!seesPeople) return <OwnersOnly owners={owners} />;
  if (people.length === 0) return <NoOne />;
  return <OwnerAccordions owners={owners} people={people} roster={(mine) => <RowsRoster mine={mine} />} />;
}

// ── 2. Accordions, names then a card ──

/** A person as their name; pressing it opens a small card with the role, status, email and phone. The popover is the design system's, opened from a trigger as every popover is. */
function PersonChip({ person }: { person: Person }) {
  return (
    <DialogTrigger>
      <AriaButton
        className={cx(
          "cursor-pointer rounded-full border border-secondary bg-primary px-3 py-1.5 text-sm font-medium outline-focus-ring transition-colors hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2",
          person.current ? "text-primary" : "text-tertiary",
        )}
      >
        {person.name}
      </AriaButton>
      <Popover placement="bottom start" size="auto" className="w-80 p-4">
        <AriaDialog aria-label={person.name} className="flex flex-col gap-3 outline-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-primary">
                {person.name}
                {person.primary && <PrimaryBadge />}
              </p>
              <p className="text-sm text-tertiary">{person.role || "No role given"}</p>
            </div>
            <StatusBadge current={person.current} />
          </div>
          <ContactLines person={person} />
        </AriaDialog>
      </Popover>
    </DialogTrigger>
  );
}

function ChipsRoster({ mine }: { mine: Person[] }) {
  const { lead, others, away } = split(mine);
  const [showAway, toggleAway] = useFold(!lead && away.length > 0);
  return (
    <>
      {lead ? <LeadBlock lead={lead} /> : <p className="text-sm text-tertiary">{mine.length === 0 ? "No one named." : "No one is current on this owner."}</p>}
      {others.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          <Label>{`Other current officers (${others.length})`}</Label>
          <div className="flex flex-wrap gap-2">
            {others.map((p) => (
              <PersonChip key={p.id} person={p} />
            ))}
          </div>
        </div>
      )}
      {away.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-secondary pt-4">
          {lead && <FoldButton open={showAway} onToggle={toggleAway} show={`Show ${away.length} not active`} hide="Hide not active" />}
          {showAway && (
            <div className="flex flex-col gap-2">
              <Label>{`Not active (${away.length})`}</Label>
              <div className="flex flex-wrap gap-2">
                {away.map((p) => (
                  <PersonChip key={p.id} person={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function AccordionChips({ owners, people, seesPeople }: OwnersProps) {
  if (!seesPeople) return <OwnersOnly owners={owners} />;
  if (people.length === 0) return <NoOne />;
  return <OwnerAccordions owners={owners} people={people} roster={(mine) => <ChipsRoster mine={mine} />} />;
}

// ── 3. Who to contact in a table, the officers in a dialog ──

const matchesQuery = (p: Person, q: string) => {
  const needle = q.trim().toLowerCase();
  return !needle || [p.name, p.role, p.email].some((v) => v.toLowerCase().includes(needle));
};

export function ContactsTable({ owners, people, seesPeople }: OwnersProps) {
  const [of, setOf] = useState<DataOwner | null>(null);
  const [q, setQ] = useState("");
  if (!seesPeople) return <OwnersOnly owners={owners} />;
  if (people.length === 0) return <NoOne />;
  const rows = owners.map((o) => {
    const mine = mineOf(people, o);
    return { id: String(o.id), owner: o, mine, lead: leadOf(mine) };
  });
  const mine = of ? mineOf(people, of) : [];
  const shown = mine.filter((p) => matchesQuery(p, q));
  const close = (open: boolean) => {
    if (!open) {
      setOf(null);
      setQ("");
    }
  };
  return (
    <>
      <EmbeddedTable
        ariaLabel="Data owners and who to contact"
        columns={[
          { id: "owner", label: "Data owner", isRowHeader: true, className: "w-[20%]" },
          { id: "contact", label: "Contact", className: "w-[22%]" },
          { id: "role", label: "Role", className: "w-[14%]" },
          { id: "email", label: "Email", className: "w-[22%]" },
          { id: "phone", label: "Phone", className: "w-[11%]" },
          { id: "officers", label: "Officers", className: "w-[11%]" },
        ]}
        rows={rows}
        minWidth="min-w-[820px]"
        cell={(r, col) => {
          const { lead } = r;
          if (col === "owner") return <span className="text-sm font-medium text-primary">{nameOf(r.owner)}</span>;
          if (col === "officers")
            return (
              <Button color="link-gray" size="sm" iconTrailing={ChevronRight} onClick={() => setOf(r.owner)}>
                {r.mine.length === 1 ? "1 officer" : `${r.mine.length} officers`}
              </Button>
            );
          if (!lead) return col === "contact" ? <span className="text-quaternary">{r.mine.length === 0 ? "No one named" : "No one is current"}</span> : null;
          if (col === "contact")
            return (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-primary">{lead.name}</span>
                {lead.primary && <PrimaryBadge />}
              </span>
            );
          if (col === "role") return lead.role || <span className="text-quaternary">Not provided</span>;
          if (col === "email")
            return (
              <a href={`mailto:${lead.email}`} title={lead.email} className="block truncate outline-focus-ring hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
                {lead.email}
              </a>
            );
          return <span className="whitespace-nowrap">{lead.phone || <span className="text-quaternary">Not provided</span>}</span>;
        }}
      />
      <PeoplePanel
        people={mine}
        shown={shown}
        isOpen={of !== null}
        onOpenChange={close}
        title={of ? nameOf(of) : "People"}
        without={["org"]}
        empty={<ListEmptyState compact icon={User01} title="No one matches" description="No officer of this owner matches that search." action={{ label: "Show all officers", onPress: () => setQ("") }} />}
      >
        {mine.length > LIMIT && <ToolbarSearch label="Search officers" placeholder="Search by name, role or email" value={q} onChange={setQ} />}
      </PeoplePanel>
    </>
  );
}

// ── 4. One directory of every officer, searched and filtered ──

export function PeopleSearch({ owners, people, seesPeople }: OwnersProps) {
  const [q, setQ] = useState("");
  const attributes = useMemo<Attribute<Person>[]>(
    () => [
      { id: "owner", kind: "options", label: "Data owner", searchable: true, options: owners.map((o) => ({ id: String(o.id), label: nameOf(o) })), get: (p) => String(p.ownerId) },
      {
        id: "status",
        kind: "options",
        label: "Status",
        options: [
          { id: "current", label: "Current" },
          { id: "not-active", label: "Not active" },
        ],
        get: (p) => (p.current ? "current" : "not-active"),
      },
      { id: "role", kind: "options", label: "Role", options: [...new Set(people.map((p) => p.role).filter(Boolean))].map((r) => ({ id: r, label: r })), get: (p) => p.role },
    ],
    [owners, people],
  );
  const filter = useAttributeFilter(attributes);
  if (!seesPeople) return <OwnersOnly owners={owners} />;
  if (people.length === 0) return <NoOne />;
  const shown = people.filter((p) => filter.matches(p) && matchesQuery(p, q));
  const reset = () => {
    filter.clear();
    setQ("");
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToolbarSearch label="Search project officers" placeholder="Search by name, role or email" value={q} onChange={setQ} />
        <FilterMenu filter={filter} />
      </div>
      <AttributeFilterChips filter={filter} />
      {shown.length === 0 ? (
        <div className="rounded-lg border border-secondary bg-primary">
          <ListEmptyState compact icon={User01} title="No one matches" description="No project officer matches that search and those filters." action={{ label: "Show all officers", onPress: reset }} />
        </div>
      ) : (
        <PeopleDirectory people={shown} />
      )}
    </div>
  );
}
