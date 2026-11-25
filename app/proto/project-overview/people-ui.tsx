"use client";

// The pieces the options of /proto/project-overview share. Every one is a real component (Avatar, AvatarLabelGroup, Badge, Button, ButtonUtility, Modal, the basic
// Table through EmbeddedTable); what is composed here is arrangement only. Type is taken from the page's own treatments: a section title is the Overview card's title
// (14px semibold, primary), a section label is "Focus areas" (12px semibold, tracked, uppercase, quaternary), a name is the data owner's name (14px medium, primary), and
// what sits under a name is 14px tertiary.

import { useState, type ReactNode } from "react";
import { ChevronDown, Mail01, Phone01, Users01 } from "@untitledui/icons";
import { Dialog, Modal, ModalHeader, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { EmbeddedTable, type EmbeddedColumn } from "@/app/pages/_shared/embedded-table";
import { cx } from "@/utils/cx";
import { countLine, sortPeople, type Person } from "./people";

export const SECTION_LABEL = "text-xs font-semibold tracking-wide text-quaternary uppercase";

/** Current or not active, said in words and colour (an indicator alone is not read by a screen reader). The same dot badge the project's own status uses. */
export function StatusBadge({ current }: { current: boolean }) {
  return (
    <BadgeWithDot size="sm" color={current ? "success" : "gray"} className="shrink-0">
      {current ? "Current" : "Not active"}
    </BadgeWithDot>
  );
}

export function PrimaryBadge() {
  return (
    <Badge size="sm" color="brand">
      Primary
    </Badge>
  );
}

const Empty = ({ children = "Not provided" }: { children?: ReactNode }) => <span className="text-quaternary">{children}</span>;

/** Email and phone, one line each, led by their icons; the email is a mail link. */
export function ContactLines({ person }: { person: Person }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm text-tertiary">
      <span className="flex min-w-0 items-center gap-1.5">
        <Mail01 className="size-3.5 shrink-0 text-quaternary" />
        {person.email ? (
          <a href={`mailto:${person.email}`} className="truncate outline-focus-ring hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            {person.email}
          </a>
        ) : (
          <Empty />
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <Phone01 className="size-3.5 shrink-0 text-quaternary" />
        {person.phone || <Empty />}
      </span>
    </div>
  );
}

// ── The directory: one line per person ──

const COLUMNS: EmbeddedColumn[] = [
  { id: "name", label: "Name", isRowHeader: true, className: "w-[21%]" },
  { id: "role", label: "Role", className: "w-[16%]" },
  { id: "org", label: "Data owner", className: "w-[17%]" },
  { id: "status", label: "Status", className: "w-[12%]" },
  { id: "email", label: "Email", className: "w-[21%]" },
  { id: "phone", label: "Phone", className: "w-[13%]" },
];

// The same table for one owner's people: no Data owner column, its width given back.
const COLUMNS_ONE_OWNER: EmbeddedColumn[] = [
  { id: "name", label: "Name", isRowHeader: true, className: "w-[25%]" },
  { id: "role", label: "Role", className: "w-[20%]" },
  { id: "status", label: "Status", className: "w-[14%]" },
  { id: "email", label: "Email", className: "w-[26%]" },
  { id: "phone", label: "Phone", className: "w-[15%]" },
];

type Row = Omit<Person, "id"> & { id: string };

const Line = ({ children }: { children: ReactNode }) => <span className="flex min-h-8 items-center">{children}</span>;

function cell(p: Row, column: string): ReactNode {
  // Not active recedes by colour step (tertiary, not a faded value: a faded one drops under the contrast text needs) and by sinking to the foot.
  const name = p.current ? "text-primary" : "text-tertiary";
  switch (column) {
    case "name":
      return (
        <Line>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cx("text-sm font-medium", name)}>{p.name}</span>
            {p.primary && <PrimaryBadge />}
          </span>
        </Line>
      );
    case "role":
      return <Line>{p.role || <Empty />}</Line>;
    case "org":
      return (
        <Line>
          <span className="text-balance">{p.org}</span>
        </Line>
      );
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
            <a href={`mailto:${p.email}`} title={p.email} className="truncate outline-focus-ring hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
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

/** `without` leaves columns out (the Data owner column, where the table is already one owner's). */
export function PeopleDirectory({ people, without = [] }: { people: Person[]; without?: string[] }) {
  const rows: Row[] = sortPeople(people).map((p) => ({ ...p, id: String(p.id) }));
  return <EmbeddedTable ariaLabel="People on this project" columns={without.includes("org") ? COLUMNS_ONE_OWNER : COLUMNS} rows={rows} cell={cell} minWidth="min-w-[640px]" />;
}

/** Everyone on the project, in a dialog (the Summary option: the page holds the count, the dialog holds the people). */
export function PeoplePanel({
  people,
  shown = people,
  isOpen,
  onOpenChange,
  title = "People",
  without,
  empty,
  children,
}: {
  /** Everyone the dialog is about (its description counts them). */
  people: Person[];
  /** The ones the table lists, where a search has narrowed them. */
  shown?: Person[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  without?: string[];
  /** In place of the table when none is shown. */
  empty?: ReactNode;
  /** Above the table (a search). */
  children?: ReactNode;
}) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <Modal className="w-full sm:max-w-6xl">
        <Dialog aria-label="People on this project">
          <ModalHeader icon={Users01} iconColor="gray" title={title} description={countLine(people)} layout="horizontal" />
          <div className="flex flex-col gap-4 p-4 pt-5 sm:p-6">
            {children}
            {shown.length === 0 && empty ? empty : <PeopleDirectory people={shown} without={without} />}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

// ── A row inside a card ──

/** A person on one line: a small avatar, the name, the role after it, a quiet mail link while they are current, and their status. */
export function PersonRow({ person }: { person: Person }) {
  return (
    <li className="flex items-center gap-3 border-t border-secondary pt-3 first:border-t-0 first:pt-0">
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className={cx("font-medium", person.current ? "text-primary" : "text-tertiary")}>{person.name}</span>
        {person.role && <span className="text-tertiary">{`, ${person.role}`}</span>}
      </p>
      {person.primary && <PrimaryBadge />}
      {person.current && person.email && <ButtonUtility size="xs" color="tertiary" icon={Mail01} href={`mailto:${person.email}`} tooltip={person.email} />}
      <StatusBadge current={person.current} />
    </li>
  );
}

/** A link-style fold: "Show 1 not active", "Show coordinates". Its open state is the caller's, so a card with no one current can start open. */
export function FoldButton({ open, onToggle, show, hide }: { open: boolean; onToggle: () => void; show: string; hide: string }) {
  return (
    <Button color="link-gray" size="sm" iconTrailing={ChevronDown} aria-expanded={open} onClick={onToggle} className="self-start">
      {open ? hide : show}
    </Button>
  );
}

export function useFold(initial = false): [boolean, () => void] {
  const [open, setOpen] = useState(initial);
  return [open, () => setOpen((o) => !o)];
}
