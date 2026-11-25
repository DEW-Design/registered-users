// LAB data for /proto/project-overview. Placeholder people only (CONTRACTS 0.3: Olivia Wyatt, Phoenix Baker, Lana Steiner, Maya Dewitt, example.com
// addresses, the phone numbers the Adelaide Hills seed already carries) and real partner organisations. The product has no "current or not active" on
// a person yet (the designer asked for it, 19 Nov 2026), so it is held here, beside the lab, as a set of officer ids. Nothing in the product reads it.

import { roleLabel } from "@/app/pages/project-detail/project-edit";
import { sampleProjectForm } from "@/app/pages/project-registration/sample-content";
import { toSavedForm } from "@/app/pages/project-registration/option-2/sections";
import { ownerName, type DataOwner, type ProjectContact, type ProjectDetailsState, type ProjectManager } from "@/app/pages/project-registration/types";
import type { ProjectState } from "@/app/pages/project-detail/edit-store";

export type Scenario = "several" | "twelve" | "many" | "one" | "inactive" | "none";

export const SCENARIOS: { id: Scenario; label: string; description: string }[] = [
  { id: "several", label: "Two owners, four people", description: "One person not active" },
  { id: "twelve", label: "Three owners, twelve people", description: "The same four placeholder people, three owners, three not active" },
  { id: "many", label: "Five owners, forty people", description: "The same four placeholder people repeated, with numbered addresses: a project with many of both" },
  { id: "one", label: "One owner, one person", description: "The smallest real project" },
  { id: "inactive", label: "No one is current", description: "An owner whose officers are all not active" },
  { id: "none", label: "No one named", description: "The empty state" },
];

const OLIVIA = { firstName: "Olivia", lastName: "Wyatt", email: "olivia.wyatt@example.com", phone: "(08) 8388 4188" };
const PHOENIX = { firstName: "Phoenix", lastName: "Baker", email: "phoenix.baker@example.com", phone: "(08) 8388 4190" };
const LANA = { firstName: "Lana", lastName: "Steiner", email: "lana.steiner@example.com", phone: "" };
const MAYA = { firstName: "Maya", lastName: "Dewitt", email: "maya.dewitt@example.com", phone: "(08) 8204 1910" };
const WHO = [OLIVIA, PHOENIX, LANA, MAYA];

const officer = (id: number, who: (typeof WHO)[number], organisation: string, role: string, roleOther: string, isPrimary: boolean): ProjectContact => ({
  id,
  ...who,
  organisation,
  role,
  roleOther,
  isPrimary,
  isManager: role === "project-manager",
});

const SEVERAL: DataOwner[] = [
  {
    id: 1,
    type: "organisation",
    orgName: "Birds SA",
    officers: [officer(11, OLIVIA, "Birds SA", "project-manager", "", true), officer(12, PHOENIX, "Birds SA", "field-survey", "", false), officer(13, LANA, "Birds SA", "other", "Volunteer survey coordinator", false)],
  },
  { id: 2, type: "organisation", orgName: "South Australian Museum", officers: [officer(21, MAYA, "South Australian Museum", "project-manager", "", true)] },
];

const ROLES = ["project-manager", "field-survey", "other", "support"];
const TWELVE: DataOwner[] = ["Birds SA", "South Australian Museum", "BirdLife Australia"].map((orgName, o) => ({
  id: o + 1,
  type: "organisation" as const,
  orgName,
  officers: WHO.map((who, i) => officer((o + 1) * 10 + i + 1, who, orgName, ROLES[i], ROLES[i] === "other" ? "Volunteer survey coordinator" : "", i === 0)),
}));

// Five owners with 14, 9, 7, 6 and 4 officers. Stress data: only four placeholder people exist (CONTRACTS 0.3), so they repeat, with a numbered address each so no two are alike.
const MANY_ORGS = ["Birds SA", "South Australian Museum", "BirdLife Australia", "Adelaide Hills Landcare", "DEW Biodiversity Team"];
const MANY_SIZES = [14, 9, 7, 6, 4];
const MANY_ROLES = ["project-manager", "field-survey", "research", "support", "other"];
const MANY: DataOwner[] = MANY_ORGS.map((orgName, o) => ({
  id: o + 1,
  type: "organisation" as const,
  orgName,
  officers: Array.from({ length: MANY_SIZES[o] }, (_, i) => {
    const who = WHO[i % 4];
    const n = Math.floor(i / 4);
    const role = i === 0 ? MANY_ROLES[0] : MANY_ROLES[1 + ((i - 1) % 4)];
    return { ...officer((o + 1) * 100 + i + 1, { ...who, email: n === 0 ? who.email : who.email.replace("@", `${n + 1}@`) }, orgName, role, role === "other" ? "Volunteer survey coordinator" : "", i === 0) };
  }),
}));

export function scenarioOwners(s: Scenario): DataOwner[] {
  if (s === "many") return MANY;
  if (s === "several") return SEVERAL;
  if (s === "twelve") return TWELVE;
  if (s === "one") return [{ ...SEVERAL[0], officers: [SEVERAL[0].officers[0]] }];
  if (s === "inactive") return [{ ...SEVERAL[0], officers: SEVERAL[0].officers.slice(0, 2) }];
  return [{ ...SEVERAL[0], officers: [] }];
}

/** The officers who are not active, by id. */
export function scenarioNotActive(s: Scenario): Set<number> {
  if (s === "several") return new Set([13]);
  if (s === "twelve") return new Set([13, 23, 32]);
  if (s === "many") return new Set(MANY.flatMap((o) => o.officers.filter((_, i) => i > 0 && i % 5 === 3).map((p) => p.id)));
  if (s === "inactive") return new Set([11, 12]);
  return new Set();
}

export interface Person {
  id: number;
  name: string;
  initials: string;
  role: string;
  org: string;
  ownerId: number;
  email: string;
  phone: string;
  primary: boolean;
  manager: boolean;
  current: boolean;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Every person written on an owner, in the owner's order. A person is there when something of them is written, as on the product page. */
export function peopleOf(owners: DataOwner[], notActive: Set<number>): Person[] {
  return owners.flatMap((o) =>
    o.officers
      .filter((p) => `${p.firstName}${p.lastName}${p.email}`.trim() !== "")
      .map((p) => {
        const name = `${p.firstName} ${p.lastName}`.trim();
        return {
          id: p.id,
          name,
          initials: initialsOf(name),
          role: roleLabel(p.role, p.roleOther),
          org: ownerName(o) || "Individual / Person",
          ownerId: o.id,
          email: p.email,
          phone: p.phone,
          primary: p.isPrimary,
          manager: p.role === "project-manager",
          current: !notActive.has(p.id),
        };
      }),
  );
}

/** Current people first (the primary contact first among them), then the ones who are not active; the owner's order is kept inside each. */
export const sortPeople = (people: Person[]): Person[] => [...people].sort((a, b) => Number(b.current) - Number(a.current) || Number(b.primary) - Number(a.primary));

/** The project's details as registration would write them for these owners: the primary contact of the first owner, and every Project Manager, in the flat lists the product page reads. */
export function detailsFor(owners: DataOwner[], base: ProjectDetailsState): ProjectDetailsState {
  const first = owners[0]?.officers ?? [];
  const managers: ProjectManager[] = owners.flatMap((o) => o.officers.filter((p) => p.role === "project-manager"));
  return {
    ...base,
    dataOwners: owners,
    dataOwnerType: "organisation",
    dataOwnerOrgName: owners[0]?.orgName ?? "",
    dataOwnerContacts: [...first].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    projectContacts: first,
    projectManagers: managers,
  };
}

// ── The project itself: what Add Project makes of its own sample answers ──

export type Kind = "full" | "typical" | "minimal";

export const KINDS: { id: Kind; label: string; description: string }[] = [
  { id: "full", label: "Everything given", description: "Add Project's sample: every kind of restriction, three methodologies, Other focus area" },
  { id: "typical", label: "A typical project", description: "One embargo, one methodology, a permit and a number" },
  { id: "minimal", label: "Only what is required", description: "Name, abstract, dates, an owner and its officers, an extent, a method; no restrictions" },
];

/** The saved project as Add Project writes it (`toSavedForm`, version 2) from its own sample answers, then narrowed to the kind. Nothing here is hand-written project content. */
export function projectOf(kind: Kind): ProjectState {
  const saved = toSavedForm(sampleProjectForm(), 2);
  const { details, collection: c, restrictions: r } = saved;
  if (kind === "typical") {
    return {
      details,
      collection: {
        ...c,
        methodologies: (c.methodologies ?? []).slice(0, 1),
        methodDetails: c.methodologies?.[0]?.id ?? "",
        limitationsAndBiases: c.methodologies?.[0]?.note ?? "",
      },
      restrictions: { ...r, enabledTypes: new Set(["embargo"]), species: [], locations: [] },
      status: "Active",
    };
  }
  if (kind === "minimal") {
    return {
      details: { ...details, sameAsShortTitle: true, fullTitle: "" },
      collection: { ...c, targetedSpeciesIds: [], collectionMethods: ["incidental"], methodologies: [], methodDetails: "", limitationsAndBiases: "" },
      restrictions: { ...r, hasRestrictions: false, enabledTypes: new Set() },
      status: "Active",
    };
  }
  return { details, collection: c, restrictions: r, status: "Active" };
}

export const countLine = (people: Person[]): string => {
  const current = people.filter((p) => p.current).length;
  const away = people.length - current;
  return away > 0 ? `${current} current, ${away} not active` : `${current} current`;
};
