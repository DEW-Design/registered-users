"use client";

// VERSION 3: which fields of a record are shown. In edit mode the right-hand column becomes a
// checklist of every category (section) and its fields; unticked fields are hidden when the record is
// viewed (the details panel and the full view). A category with every field hidden disappears.
//
// Per record, persisted with zustand to localStorage (the same pattern as field-notes-store.ts), so a
// choice survives a reload. Identifiers (a field whose label ends in "ID") are always shown: they are
// how a record is found and cited (a legacy ID can be hidden).

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  browserStorage,
  useRehydrate,
} from "@/app/pages/_shared/zustand-persist";
import type { MetaSection, SurveyRecord } from "./survey-data";
import { rowHasValue, trapLabels } from "./field-schema";
import { LANDSCAPE_SCORE_LABEL } from "./landscape";

interface VisibilityState {
  /** recordId -> hidden field keys (`${sectionId}:${label}`). */
  hidden: Record<string, string[]>;
  /** recordId -> the concepts a kind of record starts without (`startsWithout`) that this record was deliberately given. */
  shown: Record<string, string[]>;
}

const useVisibilityStore = create<VisibilityState>()(
  persist(() => ({ hidden: {}, shown: {} }), {
    name: "biodata-project-field-visibility",
    storage: createJSONStorage(browserStorage),
    skipHydration: true,
  }),
);

/** A whole section taken off the record (Remove section, in edit mode); Add section puts it back. */
export const sectionKey = (sectionId: string) => `${sectionId}:*`;

/** A section can be removed whole only if none of its fields must stay shown (an ID, a name, a start date). */
export function sectionRemovable(section: MetaSection) {
  return !sectionFieldEntries(section).some((f) => f.locked);
}

export const ALWAYS_SHOWN = /^(?!Legacy\b).*(^|\s)ID$/;
/** Fields a record needs (its name, start date, species): always shown and edited, never hidden. */
export const REQUIRED_FIELD = /( name|^Start date|^NSX code & species)$/;

/**
 * What a kind of record starts out with (designer, 18 Nov 2026). A Transect's location is its sample site dimensions, not the
 * IBRA region and subregion, so it opens with the dimensions on the form (an empty concept is otherwise left out until it is
 * added) and the IBRA concepts off. It holds for every Transect, the ones already saved too; a person's own choice, ticking
 * the IBRA concepts or unticking the dimensions, stays.
 */
const KIND_DEFAULTS: Record<string, { startsWithout: string[]; startsWith: string[] }> = {
  Transect: {
    startsWithout: ["location:IBRA region", "location:IBRA subregion"],
    startsWith: ["location:Sample site dimensions"],
  },
};
const defaultsFor = (record: Pick<SurveyRecord, "kind" | "type"> | undefined) =>
  record?.kind === "event" ? KIND_DEFAULTS[record.type] : undefined;

export interface FieldEntry {
  key: string;
  label: string;
  locked: boolean;
}

/** Every field of a section, as a visibility entry. */
export function sectionFieldEntries(section: MetaSection): FieldEntry[] {
  const labels = section.trapEffort
    ? trapLabels(section.trapEffort)
    : [
        ...(section.landscape ? [LANDSCAPE_SCORE_LABEL] : []),
        ...(section.overstorey
          ? ["Canopy type", "Projected foliage cover", "Readings"]
          : []),
        // The measurements are one concept, "Measurements", shown or hidden whole (designer, 9 Nov 2026).
        ...(section.rows ?? []).map((r) => r.label),
        ...(!section.rows
          ? (section.measurements ?? []).map((m) => m.type)
          : []),
      ];
  // A concept the record may have but never needs ("Start date" on a Site) is not locked on, whatever its label.
  const optional = new Set((section.rows ?? []).filter((r) => r.optional).map((r) => r.label));
  // A concept the record cannot be saved without ("Location comment" on an Opportune) stays on the form and cannot be hidden.
  const required = new Set((section.rows ?? []).filter((r) => r.required).map((r) => r.label));
  return labels.map((label) => ({
    key: `${section.id}:${label}`,
    label,
    locked: required.has(label) || (!optional.has(label) && (ALWAYS_SHOWN.test(label) || REQUIRED_FIELD.test(label))),
  }));
}

/**
 * The fields of a record that have no value. They are left out of the view, and out of edit mode too
 * until they are ticked in "Concepts shown" (which is how an empty field is added).
 */
export function emptyFieldKeys(record: SurveyRecord): Set<string> {
  const out = new Set<string>();
  const startsWith = new Set(defaultsFor(record)?.startsWith);
  for (const s of record.sections) {
    for (const r of s.rows ?? []) {
      if (r.type === "measurements" || r.label === "Custom properties")
        continue;
      if (startsWith.has(`${s.id}:${r.label}`)) continue;
      if (!rowHasValue(r, s.rows)) out.add(`${s.id}:${r.label}`);
    }
    if (s.overstorey) {
      if (
        !rowHasValue({ label: "Canopy type", value: s.overstorey.canopyType })
      )
        out.add(`${s.id}:Canopy type`);
      if (
        !rowHasValue({
          label: "Projected foliage cover",
          value: s.overstorey.foliageCover,
        })
      )
        out.add(`${s.id}:Projected foliage cover`);
      if (s.overstorey.readings.length === 0) out.add(`${s.id}:Readings`);
    }
  }
  return out;
}

/** Whether a card has anything to edit: a list (trap types, measurements, custom properties, location) or a field that isn't hidden. */
export function sectionShownInEdit(
  section: MetaSection,
  hidden: Set<string>,
): boolean {
  if (hidden.has(sectionKey(section.id))) return false;
  if (
    section.withMap ||
    section.siteScores ||
    section.trapEffort ||
    section.id === "custom" ||
    (section.measurements && !section.rows)
  )
    return true;
  return sectionFieldEntries(section).some(
    (f) => f.locked || !hidden.has(f.key),
  );
}

export function recordFieldEntries(record: SurveyRecord) {
  return record.sections.map((section) => ({
    section,
    fields: sectionFieldEntries(section),
  }));
}

/** The record's hidden concepts: what it was saved with, and what its kind starts without unless this record was given it. */
export function useHiddenFields(recordId: string | undefined, record?: Pick<SurveyRecord, "kind" | "type">): Set<string> {
  useRehydrate(useVisibilityStore);
  const list = useVisibilityStore((s) =>
    recordId ? s.hidden[recordId] : undefined,
  );
  const given = useVisibilityStore((s) =>
    recordId ? s.shown?.[recordId] : undefined,
  );
  const out = new Set(list ?? []);
  for (const k of defaultsFor(record)?.startsWithout ?? []) if (!given?.includes(k)) out.add(k);
  return out;
}

/**
 * Saves a record's hidden concepts. `decided` is what the person chose on the form before the empty ones were dropped from `keys`
 * (an empty concept is left out anyway), so a concept its kind starts without that they ticked is remembered as given.
 */
export function setHiddenFields(
  recordId: string,
  keys: Iterable<string>,
  record?: Pick<SurveyRecord, "kind" | "type">,
  decided?: Set<string>,
) {
  const kept = [...keys];
  const choice = decided ?? new Set(kept);
  const given = (defaultsFor(record)?.startsWithout ?? []).filter((k) => !choice.has(k));
  useVisibilityStore.setState((s) => ({
    hidden: { ...s.hidden, [recordId]: kept },
    shown: { ...s.shown, [recordId]: given },
  }));
}

/** A section is shown while at least one of its fields is (a section with no fields always shows). */
/**
 * Whether a section has anything to show when viewed. Fields with no value are left out of the view,
 * so a section whose fields are all empty is left out too (it still shows in edit mode). A field
 * carrying notes counts, so its notes stay reachable.
 */
export function sectionHasContent(
  section: MetaSection,
  noted: (key: string) => boolean = () => false,
): boolean {
  if (section.withMap || section.siteScores) return true;
  if (section.trapEffort) return section.trapEffort.length > 0;
  if ((section.measurements ?? []).length > 0) return true;
  if (
    section.landscape &&
    Object.values(section.landscape.inputs).some(
      (v) => v != null && String(v).trim() !== "",
    )
  )
    return true;
  if (
    section.overstorey &&
    (section.overstorey.readings.length > 0 ||
      rowHasValue({
        label: "Canopy type",
        value: section.overstorey.canopyType,
      }) ||
      rowHasValue({
        label: "Projected foliage cover",
        value: section.overstorey.foliageCover,
      }))
  )
    return true;
  return (
    sectionFieldEntries(section).some((f) => noted(f.key)) ||
    (section.rows ?? []).some(
      (r) =>
        r.type !== "measurements" &&
        r.label !== "Custom properties" &&
        rowHasValue(r, section.rows),
    )
  );
}

export function isSectionShown(section: MetaSection, hidden: Set<string>) {
  if (hidden.has(sectionKey(section.id))) return false;
  // Custom properties show only once one has been added (they are added in edit mode).
  if (
    section.id === "custom" &&
    !(section.rows ?? []).some((r) => r.label !== "Custom properties")
  )
    return false;
  const fields = sectionFieldEntries(section);
  return fields.length === 0 || fields.some((f) => !hidden.has(f.key));
}
