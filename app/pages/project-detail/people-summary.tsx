"use client";

// The Overview's Data owners block (the designer, 19 Nov 2026, from the Folded option of /proto/project-overview). The page held every owner's every officer as a card of five lines, twice
// (Published by, then Project managers), which a project with several owners and many officers turns into a long page. Here an owner is one pressable row: its name, how many officers are current and
// how many are not, and the person to contact with their email and phone. Pressing the row opens that owner's people in a dialog: one table, a status column, the current ones first, a search once
// there are more than a few. There is no "View all": each owner is the way in (the designer).
//
// A person has a status, Current or Not active, said in words and colour (the same dot badge the project's own status uses). It is `ProjectContact.active`: false is not active, and a person with
// none is current, so every project that exists reads as it did. Nothing sets it yet (open, for the designer).
//
// Type is the page's own: a label is "Targeted taxon" (12px 600, uppercase, tracked, quaternary), a name is the data owner's (14px 500, primary), the rest 14px (tertiary, or primary for a value).

import { useState, type ReactNode } from "react";
import { Mail01, Phone01, Users01 } from "@untitledui/icons";
import { Dialog, Modal, ModalHeader, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { EmbeddedTable, type EmbeddedColumn } from "@/app/pages/_shared/embedded-table";
import { ListEmptyState } from "@/app/pages/_shared/list-empty-state";
import { ToolbarSearch } from "@/app/pages/_shared/toolbar-search";
import { ownerName, ownersOf, type DataOwner, type ProjectDetailsState } from "@/app/pages/project-registration/types";
import { cx } from "@/utils/cx";
import { contactRole, roleLabel } from "./project-edit";

export const SECTION_LABEL = "text-xs font-semibold tracking-wide text-quaternary uppercase";

export const Label = ({ children }: { children: ReactNode }) => <p className={SECTION_LABEL}>{children}</p>;

export interface Person {
  id: string;
  name: string;
  role: string;
  /** The data owner it belongs to, by name. */
  owner: string;
  ownerId: number;
  email: string;
  phone: string;
  primary: boolean;
  current: boolean;
}

/** A person is there when something of them is written: a contact the form left blank is not one. */
const written = (p: { firstName: string; lastName: string; email: string }) => `${p.firstName}${p.lastName}${p.email}`.trim() !== "";

/** The project's data owners and the people on them. An owners list (Add Project since 16 Nov 2026) is read as it is; a project saved before it has one owner, and its contacts are that owner's people. */
export function ownersAndPeople(d: ProjectDetailsState): { owners: DataOwner[]; people: Person[] } {
  if (d.dataOwners || d.projectContacts?.length) {
    const owners = ownersOf(d);
    const people = owners.flatMap((o) =>
      o.officers.filter(written).map<Person>((p) => ({
        id: `${o.id}-${p.id}`,
        name: `${p.firstName} ${p.lastName}`.trim(),
        role: roleLabel(p.role, p.roleOther),
        owner: ownerName(o) || "Individual / Person",
        ownerId: o.id,
        email: p.email,
        phone: p.phone,
        primary: p.isPrimary,
        current: p.active !== false,
      })),
    );
    return { owners, people };
  }
  const owner: DataOwner = { id: 1, type: d.dataOwnerType, orgName: d.dataOwnerOrgName, officers: [] };
  const people = d.dataOwnerContacts.flatMap<Person>((c, i) => {
    if (!written(c)) return [];
    const r = contactRole(d, i);
    return [{ id: `1-${c.id}`, name: `${c.firstName} ${c.lastName}`.trim(), role: roleLabel(r.role, r.roleOther), owner: ownerName(owner) || "Individual / Person", ownerId: 1, email: c.email, phone: c.phone, primary: i === 0, current: true }];
  });
  return { owners: [owner], people };
}

/** Current people first, the primary contact first among them; the owner's order is kept inside each. */
export const sortPeople = (people: Person[]): Person[] => [...people].sort((a, b) => Number(b.current) - Number(a.current) || Number(b.primary) - Number(a.primary));

export function countLine(people: Person[]): string {
  const current = people.filter((p) => p.current).length;
  const away = people.length - current;
  return away > 0 ? `${current} current, ${away} not active` : `${current} current`;
}

/** Current or not active, in words and colour (an indicator alone is not read by a screen reader). */
export function StatusBadge({ current }: { current: boolean }) {
  return (
    <BadgeWithDot size="sm" color={current ? "success" : "gray"} className="shrink-0">
      {current ? "Current" : "Not active"}
    </BadgeWithDot>
  );
}

const Empty = ({ children = "Not provided" }: { children?: ReactNode }) => <span className="text-quaternary">{children}</span>;
const Line = ({ children }: { children: ReactNode }) => <span className="flex min-h-8 items-center">{children}</span>;
const linkClass = "truncate outline-focus-ring hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

// ── The people table ──

// One owner's people: the dialog is about one owner, so there is no Data owner column.
const OWNER_COLUMNS: EmbeddedColumn[] = [
  { id: "name", label: "Name", isRowHeader: true, className: "w-[25%]" },
  { id: "role", label: "Role", className: "w-[20%]" },
  { id: "status", label: "Status", className: "w-[14%]" },
  { id: "email", label: "Email", className: "w-[26%]" },
  { id: "phone", label: "Phone", className: "w-[15%]" },
];

function cell(p: Person, column: string): ReactNode {
  // Not active recedes by one step of colour (tertiary, not a faded value, which drops under the contrast text needs) and by sinking to the foot.
  switch (column) {
    case "name":
      return (
        <Line>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cx("text-sm font-medium", p.current ? "text-primary" : "text-tertiary")}>{p.name}</span>
            {p.primary && (
              <Badge size="sm" color="brand">
                Primary
              </Badge>
            )}
          </span>
        </Line>
      );
    case "role":
      return <Line>{p.role || <Empty />}</Line>;
    case "status":
      return (
        <Line>
          <StatusBadge current={p.current} />
        </Line>
      );
    case "email":
      return (
        <Line>
          {p.email ? (
            <a href={`mailto:${p.email}`} title={p.email} className={linkClass}>
              {p.email}
            </a>
          ) : (
            <Empty />
          )}
        </Line>
      );
    default:
      return (
        <Line>
          <span className="whitespace-nowrap">{p.phone || <Empty />}</span>
        </Line>
      );
  }
}

function PeopleTable({ people }: { people: Person[] }) {
  return <EmbeddedTable ariaLabel="People on this owner" columns={OWNER_COLUMNS} rows={sortPeople(people)} cell={cell} minWidth="min-w-[640px]" />;
}

const matches = (p: Person, q: string) => {
  const needle = q.trim().toLowerCase();
  return !needle || [p.name, p.role, p.email].some((v) => v.toLowerCase().includes(needle));
};
/** Past this many people a dialog has a search, as a list that grows with the data does (CONTRACTS 4.2d). */
const SEARCH_FROM = 6;

/** One owner's people, in a dialog. */
function PeopleDialog({ people, owner, onClose }: { people: Person[]; owner: DataOwner; onClose: () => void }) {
  const [q, setQ] = useState("");
  const shown = people.filter((p) => matches(p, q));
  return (
    <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
      <Modal className="w-full sm:max-w-6xl">
        <Dialog aria-label={`People on ${ownerName(owner) || "this owner"}`}>
          <ModalHeader icon={Users01} iconColor="gray" title={ownerName(owner) || "Individual / Person"} description={countLine(people)} layout="horizontal" />
          <div className="flex flex-col gap-4 p-4 pt-5 sm:p-6">
            {people.length > SEARCH_FROM && <ToolbarSearch label="Search people" placeholder="Search by name, role or email" value={q} onChange={setQ} />}
            {shown.length === 0 ? (
              <div className="rounded-lg border border-secondary bg-primary">
                <ListEmptyState compact icon={Users01} title="No one matches" description="No one on this list matches that search." action={{ label: "Show everyone", onPress: () => setQ("") }} />
              </div>
            ) : (
              <PeopleTable people={shown} />
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

// ── The block ──

/** The data owners as a few pressable rows: each one's name, its count, and who to contact with their email and phone; the people open in a dialog. `reserveEdit` leaves room at the end of the label row for the card's edit icon. */
export function OwnersSummary({ owners, people, seesPeople, empty, reserveEdit = false }: { owners: DataOwner[]; people: Person[]; seesPeople: boolean; empty: ReactNode; reserveEdit?: boolean }) {
  const [openOwner, setOpenOwner] = useState<number | null>(null);
  const dialogOwner = owners.find((o) => o.id === openOwner) ?? null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={cx(reserveEdit && "pr-10")}>
        <Label>{owners.length > 1 ? "Data owners" : "Data owner"}</Label>
      </div>
      {!seesPeople ? (
        // The DEW privacy standard (11 Nov 2026): outside DEW the data owner's name is shown and no one in it.
        <ul className="flex flex-col gap-2">
          {owners.map((o) => (
            <li key={o.id} className="text-sm font-medium text-primary">
              {ownerName(o) || "Individual / Person"}
            </li>
          ))}
        </ul>
      ) : people.length === 0 ? (
        empty
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
                  onClick={() => setOpenOwner(o.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer flex-col gap-1 rounded-lg px-2 py-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-primary">{ownerName(o) || "Individual / Person"}</span>
                    <span className="shrink-0 text-sm text-tertiary">{countLine(mine)}</span>
                  </span>
                  {lead ? (
                    <>
                      <span className="text-sm text-tertiary">{[lead.name, lead.role].filter(Boolean).join(", ")}</span>
                      {(lead.email || lead.phone) && (
                        <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tertiary">
                          {lead.email && (
                            <span className="flex min-w-0 items-center gap-1.5">
                              <Mail01 className="size-3.5 shrink-0 text-quaternary" />
                              <span className="truncate">{lead.email}</span>
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone01 className="size-3.5 shrink-0 text-quaternary" />
                              {lead.phone}
                            </span>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-tertiary">No one is current</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {dialogOwner && <PeopleDialog key={dialogOwner.id} people={people.filter((p) => p.ownerId === dialogOwner.id)} owner={dialogOwner} onClose={() => setOpenOwner(null)} />}
    </div>
  );
}
