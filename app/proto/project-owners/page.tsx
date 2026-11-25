"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users01 } from "@untitledui/icons";
import { PrototypeTools } from "@/app/_prototype-tools/prototype-tools";
import { useRegisterTool } from "@/app/_prototype-tools/tools";
import { LayoutOptionSwitcher } from "@/app/pages/_shared/layout-option-switcher";
import { useFeatureAccess } from "@/lib/use-feature-access";
import { useRoleHref } from "@/lib/use-role-href";
import { Label } from "../project-overview/blocks";
import { SCENARIOS, peopleOf, scenarioNotActive, scenarioOwners, type Scenario } from "../project-overview/people";
import { AccordionChips, AccordionRows, ContactsTable, PeopleSearch } from "./variants";

// LAB: data owners and their project officers, for a project with several owners and many officers (the designer, 19 Nov 2026: "we are expecting multiple data owners and a lot of
// project officers. Open to ideas of showing project officer on progressive disclosure as well. Also, I like how we had used accordion here for the page"). The people block of the
// Overview's Project Identification chapter, alone, on its own states (`/proto/project-overview` has the whole page). Principles first (CONTRACTS 0.10): the job is to find who to
// contact, and who else is on the project and whether they are still there. 6 Reveal in steps (the many behind a click), 2 One thing first (an owner's primary contact), 7 Design every
// state (one owner and three officers, five owners and forty, no one current, none named, a role that sees no people), 3 One system (the page's accordion, its table, its search and Filter).
// Where they pull apart: Say less against Make it obvious. A person behind a click is less to read and one more click to find.
//
//   1  Owner accordions: an owner is a row (name, a count, its primary contact in a line) that opens to its contact and a line per officer, six at a time; the ones not active fold
//   2  Owner accordions, names then a card: the same rows, the officers as names, each opening a small card (role, status, email, phone). The densest: forty names are four lines
//   3  Contacts table: one line per owner with who to contact and how, always in view; "7 officers" opens that owner's officers in a dialog, with a search
//   4  Directory: every officer in one table with the product's search and Filter (owner, status, role), paged past ten
//
// Stress data: four placeholder people repeat (CONTRACTS 0.3), with numbered addresses. Lab only (CONTRACTS 5.4).
const OPTIONS = [
  { id: "rows", label: "1: Accordions, a line each", description: "An owner opens to its contact and a line per officer" },
  { id: "chips", label: "2: Accordions, names", description: "An owner opens to names; a name opens a card" },
  { id: "contacts", label: "3: Contacts table", description: "Who to contact per owner; officers in a dialog" },
  { id: "directory", label: "4: Directory", description: "Every officer in one table, searched and filtered" },
] as const;
type Option = (typeof OPTIONS)[number]["id"];

function Lab(): ReactNode {
  const params = useSearchParams();
  const router = useRouter();
  const roleHref = useRoleHref();
  const seesPeople = useFeatureAccess("personDetails");
  const option = (OPTIONS.find((o) => o.id === params.get("option"))?.id ?? "rows") as Option;
  const scenario = (SCENARIOS.find((s) => s.id === params.get("people"))?.id ?? "many") as Scenario;

  const owners = useMemo(() => scenarioOwners(scenario), [scenario]);
  const people = useMemo(() => peopleOf(owners, scenarioNotActive(scenario)), [owners, scenario]);

  useRegisterTool({
    id: "people",
    label: "People shown",
    barLabel: "People",
    barValue: SCENARIOS.find((s) => s.id === scenario)?.label ?? "",
    icon: Users01,
    options: SCENARIOS,
    value: scenario,
    onChange: (id) => router.push(roleHref(`/proto/project-owners?option=${option}&people=${id}`)),
  });

  const props = { owners, people, seesPeople };
  return (
    <div className="min-h-screen bg-secondary px-6 py-8 font-barlow">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 rounded-xl border border-secondary bg-primary p-8">
        <h2 className="text-lg font-semibold text-primary">Project Identification</h2>
        <div className="flex min-w-0 flex-col gap-3">
          <Label>{option === "directory" ? "Project officers" : owners.length > 1 ? "Data owners" : "Data owner"}</Label>
          {option === "rows" && <AccordionRows key={scenario} {...props} />}
          {option === "chips" && <AccordionChips key={scenario} {...props} />}
          {option === "contacts" && <ContactsTable key={scenario} {...props} />}
          {option === "directory" && <PeopleSearch key={scenario} {...props} />}
        </div>
      </div>
      <PrototypeTools />
      <LayoutOptionSwitcher ariaLabel="Owner options" current={option} options={OPTIONS.map((o) => ({ ...o, href: `/proto/project-owners?option=${o.id}&people=${scenario}` }))} />
    </div>
  );
}

export default function ProjectOwnersLab(): ReactNode {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
