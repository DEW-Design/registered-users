"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { File06, Users01 } from "@untitledui/icons";
import { PrototypeTools } from "@/app/_prototype-tools/prototype-tools";
import { useRegisterTool } from "@/app/_prototype-tools/tools";
import { HeroMeta, RecordHero } from "@/app/pages/_shared/record-hero";
import { LayoutOptionSwitcher } from "@/app/pages/_shared/layout-option-switcher";
import { EditStoreProvider, useEditStore } from "@/app/pages/project-detail/edit-store";
import { adelaideHillsSeed } from "@/app/pages/project-detail/project-seed";
import { ProjectTab, formatDay } from "@/app/pages/project-detail/project-tab";
import { ownerName, ownersOf } from "@/app/pages/project-registration/types";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { useRoleHref } from "@/lib/use-role-href";
import { useUserRole } from "@/lib/use-user-role";
import { BriefingOverview, FoldedOverview, MapLedOverview } from "./overview";
import { KINDS, SCENARIOS, detailsFor, projectOf, scenarioNotActive, scenarioOwners, type Kind, type Scenario } from "./people";

// LAB: the whole project Overview, rethought as a reflection of Add Project (the designer, 19 Nov 2026: "I wanted a redesign of the whole page ... The overview tab is a
// reflection of what the user provides in the project creation"). The project here is not hand-written: it is what Add Project makes of its own sample answers
// (`sampleProjectForm`, saved by `toSavedForm`), so the page is read against exactly what a person gave. Three kinds of project (everything given, a typical one, only what
// is required) and five sets of people (two owners, twelve people, one, no one current, no one named) are the lab's controls.
//
// Principles first (CONTRACTS 0.10). The job: a registered user or an admin opens a project to learn what it is, who is behind it and whether they are still there, where and
// how its data was collected, and what is held back. Bearing on it: 4 Tell the truth (the page says what was given, in the words it was asked in, in the form it was given:
// a list is a list), 1 Say less (a row of label and value for every field, "Not provided" five times, the people twice, the heading's own words repeated under it), 2 One thing
// first (nine cards at one weight: nothing wins), 6 Reveal in steps (the answer first, its detail a click away), 7 Design every state (a project with everything, with one
// restriction, with none; with two owners, none current). Where they pull apart: Say less against Make it obvious. Folding is less to read and one more click to find a thing.
// The options sit at different points on that line.
//
//   Now       the real Overview on the same project. It reads fields, not answers: the methodologies are joined into one comma string, "None required / Not provided / Not provided"
//             is three rows, the restrictions are five tall cards, and the people are in two lists
//   Briefing  one column, Add Project's three chapters one under another, everything in view; prose as prose, people as cards, the extent beside focus areas and permits
//   Map-led   the extent map stays in view (sticky) while the chapters scroll beside it; where the project has restricted locations they are named under it
//   Folded    each chapter says its answer while closed (the extent, the focus areas, the methodology; the kinds of restriction) and opens to the whole; Identification starts open
//
// Lab only (CONTRACTS 5.4): nothing outside app/proto imports it.
const OPTIONS = [
  { id: "now", label: "Now", description: "The real Overview, on the same project" },
  { id: "briefing", label: "1: Briefing", description: "One column, the flow's three chapters, everything in view" },
  { id: "map", label: "2: Map-led", description: "The extent stays in view beside the chapters" },
  { id: "folded", label: "3: Folded", description: "Each chapter says its answer, and opens to the whole" },
] as const;
type Option = (typeof OPTIONS)[number]["id"];

function Hero() {
  const { project, meta } = useEditStore();
  const d = project.details;
  const color = project.status === "Active" ? "success" : project.status === "Under review" ? "warning" : "gray";
  return (
    <RecordHero eyebrow="Project" title={d.shortTitle}>
      <HeroMeta label="Project ID">{meta.code}</HeroMeta>
      <HeroMeta label="Start Date">{formatDay(d.startDate) || "Not provided"}</HeroMeta>
      <HeroMeta label="End Date">{d.endDate ? formatDay(d.endDate) : "Ongoing"}</HeroMeta>
      <HeroMeta label="Status">
        <BadgeWithDot size="sm" color={color} className="inline-flex align-baseline">
          {project.status}
        </BadgeWithDot>
      </HeroMeta>
      <HeroMeta label="Published by">{ownersOf(d).map(ownerName).filter(Boolean).join(", ")}</HeroMeta>
    </RecordHero>
  );
}

function Lab(): ReactNode {
  const params = useSearchParams();
  const router = useRouter();
  const roleHref = useRoleHref();
  const role = useUserRole();
  const option = (OPTIONS.find((o) => o.id === params.get("option"))?.id ?? "briefing") as Option;
  const scenario = (SCENARIOS.find((s) => s.id === params.get("people"))?.id ?? "several") as Scenario;
  const kind = (KINDS.find((k) => k.id === params.get("project"))?.id ?? "full") as Kind;

  const seed = useMemo(() => {
    const project = projectOf(kind);
    const details = detailsFor(scenarioOwners(scenario), project.details);
    return { ...adelaideHillsSeed, meta: { ...adelaideHillsSeed.meta, id: "lab-coorong", code: "BD-5138", publisher: "Birds SA" }, project: { ...project, details }, records: [], artefacts: [] };
  }, [kind, scenario]);
  const notActive = useMemo(() => scenarioNotActive(scenario), [scenario]);

  const go = (next: { option?: Option; people?: Scenario; project?: Kind }) =>
    router.push(roleHref(`/proto/project-overview?option=${next.option ?? option}&people=${next.people ?? scenario}&project=${next.project ?? kind}`));

  useRegisterTool({
    id: "project",
    label: "Project given",
    barLabel: "Project",
    barValue: KINDS.find((k) => k.id === kind)?.label ?? "",
    icon: File06,
    options: KINDS,
    value: kind,
    onChange: (id) => go({ project: id as Kind }),
  });
  useRegisterTool({
    id: "people",
    label: "People shown",
    barLabel: "People",
    barValue: SCENARIOS.find((s) => s.id === scenario)?.label ?? "",
    icon: Users01,
    options: SCENARIOS,
    value: scenario,
    onChange: (id) => go({ people: id as Scenario }),
  });

  return (
    <div className="min-h-screen bg-secondary px-6 py-8 font-barlow">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <EditStoreProvider key={`${role}:${scenario}:${kind}`} canEdit={role !== "public-user"} role={role} seed={seed}>
          <Hero />
          <div className="px-6">
            {option === "now" && <ProjectTab layout="v3" sheet repeatHeaderFacts={false} disclosure />}
            {option === "briefing" && <BriefingOverview notActive={notActive} />}
            {option === "map" && <MapLedOverview notActive={notActive} />}
            {option === "folded" && <FoldedOverview notActive={notActive} />}
          </div>
        </EditStoreProvider>
      </div>
      <PrototypeTools />
      <LayoutOptionSwitcher
        ariaLabel="Overview options"
        current={option}
        options={OPTIONS.map((o) => ({ ...o, href: `/proto/project-overview?option=${o.id}&people=${scenario}&project=${kind}` }))}
      />
    </div>
  );
}

export default function ProjectOverviewLab(): ReactNode {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
