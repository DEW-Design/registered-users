// The Overview as a reflection of Add Project (the designer, 19 Nov 2026: "the overview tab is a reflection of what the user provides in the project creation").
// Everything here is read from the project's own answers and said in the flow's words: its three step titles, its section names, its labels ("Geographic extent",
// "Targeted taxon", "Methodology", "Variations, limitations and biases") and its own summaries (`restrictionSummaryFor`, the strings the Review step writes). An answer
// that was not given is left out; the page says once, at the foot of its chapter, which were not (CONTRACTS 2.3: omitted or "Not provided", never a row of dashes).

import type { FC } from "react";
import type { DateValue } from "react-aria-components";
import { getLocalTimeZone } from "@internationalized/date";
import type { ProjectState } from "@/app/pages/project-detail/edit-store";
import { boundaryCentre } from "@/app/pages/project-detail/field-schema";
import { drawnShapeLine } from "@/app/pages/_shared/map-search/draw-tool-buttons";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { EMBARGO_TYPE_OPTIONS, PROJECT_METADATA_CONCEPTS, REGISTRATION_SPECIES, SPECIES_CONCEPTS, collectionMethodLabels } from "@/app/pages/project-registration/data";
import { conceptLabel, conceptValueLabel } from "@/app/pages/project-registration/concept-rows";
import { geoExtentSummary } from "@/app/pages/project-registration/geo-extent-picker";
import { OTHER_METHODOLOGY } from "@/app/pages/project-registration/methodology-fields";
import { sectionMeta } from "@/app/pages/project-registration/option-2/sections";
import { expectationLabel } from "@/app/pages/project-registration/restriction-fields";
import { restrictionSummaryFor, RESTRICTION_TYPE_META } from "@/app/pages/project-registration/step-3-privacy-restrictions";
import { allRecordsOf, culturalOf, isGeoExtentComplete, type MethodologyChoice, type RestrictionTypeKey } from "@/app/pages/project-registration/types";

const day = (d: DateValue | null | undefined) => (d ? d.toDate(getLocalTimeZone()).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "");

export interface Fact {
  label: string;
  value: string;
}

export interface RestrictionItem {
  key: RestrictionTypeKey;
  /** The section's name in Add Project's column 2 ("Species restrictions"). */
  title: string;
  icon: FC<{ className?: string }>;
  /** The line Add Project's Review writes for it. */
  summary: string;
  /** What was entered, the product page's own labels, empty ones left out. */
  facts: Fact[];
}

export interface Content {
  fullTitle: string;
  abstract: string;
  boundary: Boundary | null;
  extentText: string;
  hasExtent: boolean;
  centre: [number, number] | null;
  /** The targeted taxon: the common names of the species chosen in Add Project. */
  taxa: string[];
  /** "Systematic", "Incidental observations" ... */
  methodKind: string;
  /** The methodologies added, each with its own note: a list, as it is asked, not one string. */
  methodologies: { name: string; note: string }[];
  /** A project saved before the list existed: the methodology and the limitations as text. */
  legacy: { methodology: string; limitations: string } | null;
  /** The permit numbers of the project's datasets, rolled up: they are entered on a dataset, so this is read only (`usePermitNumbers`). */
  permitNumbers: string[];
  hasRestrictions: boolean;
  restrictions: RestrictionItem[];
}

const label = (m: MethodologyChoice) => (m.id === OTHER_METHODOLOGY && m.other?.trim() ? m.other.trim() : m.id);
const fact = (l: string, v: string | undefined | null): Fact[] => (v && v.trim() ? [{ label: l, value: v.trim() }] : []);

function factsFor(key: RestrictionTypeKey, p: ProjectState): Fact[] {
  const r = p.restrictions;
  if (key === "embargo") {
    const e = r.embargo;
    return [
      ...fact("Embargo type", e.types.map((t) => (t === "other" ? e.typeOther || "Other" : EMBARGO_TYPE_OPTIONS.find((o) => o.id === t)?.label)).join(", ")),
      ...fact("Justification", e.reason),
      ...fact("Ends", day(e.endDate)),
      ...fact("After the embargo ends", e.afterEmbargo),
    ];
  }
  if (key === "species")
    return r.species.flatMap((s) => {
      const name = REGISTRATION_SPECIES.find((x) => x.id === s.speciesId)?.commonName ?? s.speciesId;
      const picked = s.concepts.filter((c) => c.concept);
      return [
        ...fact("Species", name),
        ...fact("Restricted concept", s.scope === "all" ? "All concepts" : picked.map((c) => conceptLabel(c, SPECIES_CONCEPTS)).join(", ")),
        ...(s.scope === "selected" ? fact("Rule", picked.map((c) => conceptValueLabel(c, SPECIES_CONCEPTS) || "Withheld").join(", ")) : []),
        ...fact("Expectations data restrictions", expectationLabel(s.expectation)),
        ...(s.scope === "all" ? fact("Justification", s.justification) : picked.flatMap((c) => fact(`Justification: ${conceptLabel(c, SPECIES_CONCEPTS)}`, c.justification))),
      ];
    });
  if (key === "locations")
    return r.locations.flatMap((l) => [
      ...fact("Location", l.name),
      ...fact("Extent", isGeoExtentComplete(l.extent) ? geoExtentSummary(l.extent) : ""),
      ...fact("Expectations data restrictions", expectationLabel(l.expectation)),
      ...fact("Justification", l.justification),
    ]);
  if (key === "cultural") {
    const c = culturalOf(r);
    return [...fact("Indigenous Information Authority", c.authority), ...fact("IIA contact details", c.contact), ...fact("Expectations data restrictions", expectationLabel(c.expectation)), ...fact("Justification", c.justification)];
  }
  if (key === "all") {
    const a = allRecordsOf(r);
    return [...fact("Expectations data restrictions", expectationLabel(a.expectation)), ...fact("Justification", a.justification)];
  }
  if (key === "metadata")
    return r.metadata.concepts.filter((c) => c.concept).flatMap((c) => [...fact(conceptLabel(c, PROJECT_METADATA_CONCEPTS), conceptValueLabel(c, PROJECT_METADATA_CONCEPTS)), ...fact("Justification", c.justification)]);
  return fact("Restriction", r.otherRestrictions);
}

export function contentOf(p: ProjectState, permitNumbers: string[] = []): Content {
  const { details: d, collection: c, restrictions: r } = p;
  const boundary = c.geographicExtent.boundary ?? null;
  const hasExtent = !!boundary || isGeoExtentComplete(c.geographicExtent);
  // A project can hold more than one collection method (the designer, 19 Nov 2026): each brings its own list.
  const methods = c.collectionMethods;
  const kind = collectionMethodLabels(methods);
  const chosen = [...(methods.includes("systematic") ? (c.methodologies ?? []) : []), ...(methods.includes("analysis") ? (c.analyses ?? []) : [])];
  const listed = chosen.map((m) => ({ name: label(m), note: m.note.trim() }));
  const methodologies = methods.includes("other") && c.otherMethod?.trim() ? [...listed, { name: c.otherMethod.trim(), note: "" }] : listed;
  const legacy = !c.methodologies && !c.analyses && (c.methodDetails || c.limitationsAndBiases) ? { methodology: c.methodDetails, limitations: c.limitationsAndBiases } : null;
  const enabled = r.hasRestrictions ? RESTRICTION_TYPE_META.filter((m) => r.enabledTypes.has(m.key)) : [];
  const fullTitle = d.sameAsShortTitle ? "" : d.fullTitle;
  return {
    fullTitle,
    abstract: d.abstract,
    boundary,
    extentText: boundary ? drawnShapeLine(boundary) : geoExtentSummary(c.geographicExtent),
    hasExtent,
    centre: boundary ? boundaryCentre(boundary) : null,
    taxa: c.targetedSpeciesIds.map((id) => REGISTRATION_SPECIES.find((x) => x.id === id)?.commonName ?? id),
    methodKind: kind,
    methodologies,
    legacy,
    permitNumbers,
    hasRestrictions: enabled.length > 0,
    restrictions: enabled.map((m) => ({ key: m.key, title: sectionMeta(m.key, 2).title, icon: m.icon, summary: restrictionSummaryFor(m.key, r), facts: factsFor(m.key, p) })),
  };
}
