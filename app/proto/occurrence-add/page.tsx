"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus01, Feather, GitBranch01, Plus, Settings01 } from "@untitledui/icons";
import { PrototypeTools } from "@/app/_prototype-tools/prototype-tools";
import { useRegisterTool } from "@/app/_prototype-tools/tools";
import { LayoutOptionSwitcher } from "@/app/pages/_shared/layout-option-switcher";
import { ScaffoldButton } from "@/components/scaffold/controls";
import { EditStoreProvider, useEditStore } from "@/app/pages/project-detail/edit-store";
import { adelaideHillsSeed } from "@/app/pages/project-detail/project-seed";
import { RecordFullView } from "@/app/pages/project-detail/record-full-view";
import { createRecord, occurrenceStart } from "@/app/pages/project-detail/record-rules";
import { formatDate, type SurveyRecord } from "@/app/pages/project-detail/survey-data";
import { useUserRole } from "@/lib/use-user-role";
import { useRoleHref } from "@/lib/use-role-href";

// LAB: adding an occurrence. An occurrence sits under an event (a Transect, a Visit), and the event has already said who was there, when and
// where. The add screen opens every card in edit mode, so the person meets Observers, Temporal details and Location (and Voucher and Custom
// properties) before the species has been named, and has to read past answers the event already gave. The designer, 18 Nov 2026: "When
// user tries to add an occurrence, unless methodology defines otherwise, collapse everything except occurrence details for the edit screens.
// Next to observers, temporal, location it would be good to have text like 'only fill out if you wish to define more precisely than parent
// event fields'."
//
// Then, the same day: "I can see the inherited details in my edit view but I am unsure if they are entered or inherited ... we will not store
// these inherited details twice but just pull them from the parent ... the inherited information must be made obvious to the user that the values
// are inherited, and also allow to override if needed." So the three cards are not copies the person has to recognise: they are the parent event's,
// and are drawn as such.
//
// The screen below is the real one (`RecordFullView` with `isNew`, the Adelaide Hills seed, its cards and its save). The occurrence carries
// `inherits` (Temporal details, Observers, Location information): those sections are stored empty and read from the event whenever the record is shown
// (`resolveInherited`, once, in the edit store), so the occurrence follows its event. In the edit view an inherited card says "Inherited from Transect
// TR00501" in its header, shows the event's values shaded (not as fields) with one Override, and its border is the plain one, not the editing one. Override
// makes the card the occurrence's own (its fields, the editing border, "Use Transect TR00501's values" to go back); what is entered is stored. A saved
// occurrence shows the same marker on the cards it inherits. After saving, "Move the event a day on" changes the parent so the occurrence is seen to follow.
// The rule is in record-rules.ts (`occurrenceStart`, `inheritanceSource`, `resolveInherited`, `withInherits`); a folded card opens and closes like a card being read.
// Principles first (0.10): 4 Tell the truth (a value is marked as the event's or the occurrence's, never left to be guessed), 6 Reveal in steps (the species first, the rest
// behind a click), 1 Say less (a card that restates the parent is folded, the marker is the one fact in the header), 7 Design every state (under the project there
// is no event to take from; a Visit has no location, so it comes from the Site above; a methodology that asks for its own details).
//   A  as it is: every card open, as the project page adds an occurrence today
//   B  inherited: Occurrence details open, the rest folded, the event's sections inherited and marked
// What is simulated (Scaffold, not product): the methodology. Which of the project's methodologies ask each occurrence for its own
// observers, date or location is not in any source, so the bar offers the three cases instead of naming a methodology.
// Saved records go to this lab's own project id, so the Adelaide Hills page is untouched. Lab only (CONTRACTS 5.4).

type OptionId = "open" | "folded";
const OPTIONS: { id: OptionId; label: string; description: string }[] = [
  { id: "open", label: "A: As it is", description: "Every card open, starting from today's date and the current observer" },
  { id: "folded", label: "B: Inherited", description: "4 Tell the truth: the event's sections are read from it, marked, and can be overridden" },
];

const PARENTS = [
  { id: "tr1", label: "A Transect", short: "Transect", description: "Has its own observers, dates and location" },
  { id: "vu1", label: "A Visit", short: "Visit", description: "No location of its own" },
  { id: "project", label: "The project", short: "Project", description: "No event to take from, so nothing folds" },
];
const KINDS = [
  { id: "Population", label: "Population", description: "Cards: details, temporal, observers, voucher, location, custom" },
  { id: "Individual", label: "Individual", description: "The same cards as a Population" },
];
// Simulated: what the project's methodology asks each occurrence to record for itself. The list is the designer's to give.
const METHODS: { id: string; label: string; short: string; description: string; own: string[] }[] = [
  { id: "none", label: "Parent event defines", short: "Parent defines", description: "The default", own: [] },
  { id: "location", label: "Asks for each location", short: "Own location", description: "Location stays open", own: ["location"] },
  { id: "all", label: "Asks for observers, dates and location", short: "Own details", description: "All three stay open", own: ["observers", "temporal", "location"] },
];

const today = () => new Date().toISOString().slice(0, 10);
const LAB_PROJECT = { ...adelaideHillsSeed, meta: { ...adelaideHillsSeed.meta, id: "lab-occurrence-add" } };

/** The occurrence as the Add menu starts it (option A, as the project page does today: today's date, the current observer, the parent's coordinates), or as the rule has it start under this parent: the event's sections inherited (option B). */
function startOccurrence(parent: SurveyRecord | null, type: string, records: SurveyRecord[], byId: (id: string | null | undefined) => SurveyRecord | undefined, own: string[], option: OptionId) {
  const blank = createRecord({ kind: "occurrence", type, parent, name: "", date: parent?.date ?? today(), recordedBy: "", records });
  return option === "folded" ? occurrenceStart(blank, byId, new Set(own)) : { inherit: [] as string[], folded: [] as string[], record: blank };
}

/** What a person can do to the parent while the occurrence is on screen, to see that the occurrence follows it: move it a day on. */
function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function Stage({ option, parentId, type, own }: { option: OptionId; parentId: string; type: string; own: string[] }): ReactNode {
  const { records, recordById, saveRecord } = useEditStore();
  const parent = parentId === "project" ? null : (recordById(parentId) ?? null);
  const [start, setStart] = useState(() => startOccurrence(parent, type, records, recordById, own, option));
  const [savedId, setSavedId] = useState<string | null>(null);
  const saved = savedId ? recordById(savedId) : undefined;
  const folds = option === "folded" ? start.folded : undefined;

  if (saved) {
    const takesDate = saved.inherits?.includes("temporal") && parent;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 font-geist text-sm text-secondary">
          <span>Saved. This is the occurrence as it now reads.</span>
          <span className="flex items-center gap-2">
            {takesDate && (
              <ScaffoldButton
                iconLeading={CalendarPlus01}
                onClick={() =>
                  saveRecord({
                    ...parent,
                    date: nextDay(parent.date),
                    sections: parent.sections.map((s) => ({
                      ...s,
                      rows: s.rows?.map((r) => (r.term === "eventDate" ? { ...r, value: formatDate(nextDay(parent.date)) } : r.label === "End date" && /^\d{4}-\d{2}-\d{2}$/.test(r.value) ? { ...r, value: nextDay(r.value) } : r)),
                    })),
                  })
                }
              >
                Move {parent.type} {parent.code} a day on
              </ScaffoldButton>
            )}
            <ScaffoldButton
              iconLeading={Plus}
              onClick={() => {
                setSavedId(null);
                setStart(startOccurrence(parent, type, records, recordById, own, option));
              }}
            >
              Add another occurrence
            </ScaffoldButton>
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
          <RecordFullView key={saved.id} record={saved} onSelect={() => {}} onAdd={() => {}} onExit={() => {}} />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
      <RecordFullView
        key={start.record.id}
        record={start.record}
        isNew
        foldedInEdit={folds}
        onSelect={() => {}}
        onAdd={() => {}}
        onExit={() => {}}
        onCreated={(r) => setSavedId(r.id)}
        onDiscardNew={() => setStart(startOccurrence(parent, type, records, recordById, own, option))}
      />
    </div>
  );
}

function Lab(): ReactNode {
  const params = useSearchParams();
  const router = useRouter();
  const roleHref = useRoleHref();
  const role = useUserRole();
  const option = (OPTIONS.find((o) => o.id === params.get("option"))?.id ?? "folded") as OptionId;
  const parentId = PARENTS.find((p) => p.id === params.get("parent"))?.id ?? "tr1";
  const type = KINDS.find((k) => k.id === params.get("type"))?.id ?? "Population";
  const method = METHODS.find((m) => m.id === params.get("method")) ?? METHODS[0];

  const href = (next: { option?: string; parent?: string; type?: string; method?: string }) =>
    `/proto/occurrence-add?option=${next.option ?? option}&parent=${next.parent ?? parentId}&type=${next.type ?? type}&method=${next.method ?? method.id}`;
  const go = (next: Parameters<typeof href>[0]) => router.push(roleHref(href(next)));
  useRegisterTool({ id: "parent", label: "Adding the occurrence under", barLabel: "Under", icon: GitBranch01, options: PARENTS, value: parentId, onChange: (id) => go({ parent: id }) });
  useRegisterTool({ id: "kind", label: "Occurrence type", barLabel: "Type", icon: Feather, options: KINDS, value: type, onChange: (id) => go({ type: id }) });
  useRegisterTool({ id: "method", label: "The project's methodology (simulated)", barLabel: "Methodology", barValue: method.short, icon: Settings01, options: METHODS, value: method.id, onChange: (id) => go({ method: id }) });

  return (
    <div className="min-h-screen bg-secondary px-6 py-8 font-barlow">
      <div className="mx-auto w-full max-w-5xl">
        <EditStoreProvider key={role} canEdit={role !== "public-user"} role={role} seed={LAB_PROJECT}>
          <Stage key={`${option}:${parentId}:${type}:${method.id}`} option={option} parentId={parentId} type={type} own={method.own} />
        </EditStoreProvider>
      </div>
      <PrototypeTools />
      <LayoutOptionSwitcher ariaLabel="Add occurrence options" current={option} options={OPTIONS.map((o) => ({ ...o, href: href({ option: o.id }) }))} />
    </div>
  );
}

export default function OccurrenceAddLab(): ReactNode {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
