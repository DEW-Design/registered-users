// What can be added where, and how a new record starts out.
//
// The hierarchy: the business's data model sheet of 20 Nov 2026 ("what can go under where") for events, which replaced the nesting rule of 10 Nov 2026
// ("any event can have any event"), and the designer's rules of 28 Sept 2026 for the records inside an event:
//   Project > Site, Ramble, Transect, Quadrat, Block, Trap, Custom event, Opportune: every event type but those the sheet marks "must have a parent event"
//          (Visit, Point intercept), and every occurrence and observation
//   An event can hold the events `CHILD_EVENTS` lists for its type (the sheet's "Allowed children events"):
//          Site:            Site, Visit, Ramble, Transect, Block, Trap, Custom event, Opportune, Point intercept
//          Visit*:          Site, Ramble, Transect, Trap, Custom event, Opportune, Point intercept
//          Ramble:          Site, Visit, Transect, Trap, Custom event, Opportune, Point intercept
//          Transect:        Site, Visit, Ramble, Trap, Custom event, Opportune, Point intercept
//          Block:           Site, Visit, Ramble, Transect, Trap, Custom event, Opportune, Point intercept
//          Trap:            Site, Visit, Trap, Custom event, Opportune, Point intercept
//          Custom event:    Site, Visit, Ramble, Transect, Block, Trap, Custom event, Opportune, Point intercept
//          Opportune:       Visit, Ramble, Transect, Block, Trap, Custom event, Opportune, Point intercept
//          Point intercept*: Visit, Custom event (the sheet's copy we hold is cut off after these two)
//          (* = must have a parent event; the sheet calls a Trap a "Trap Array" and a Custom event "Custom")
//   The sheet has no Quadrat: it is kept, inside every event but a Point intercept and a Quadrat, and holding what a Transect holds (open, for the designer).
//   Marked "(?)" on the sheet and allowed here: a Trap inside a Ramble and inside a Transect.
//   any event or sub-event > Occurrences (Individual, Population) and Observations (Individual, Population,
//          Non-biotic, Community) ("Observation can sit under an event or sub-event")
//   Occurrence > exactly one Observation of the same type (Individual or Population)
//   Observation > nothing
// No event is ever added inside an Occurrence or an Observation.
//
// Opportune and Point intercept have their own frames (survey-data.ts `frameEventSections`): a start date left empty is inherited
// from the parent event (`inheritsStartDate`), a Point intercept's location is one coordinate point, and Location comment is compulsory.
//
// A record added without a name is named by its type and a sequence number (`autoName`), and a record's "Duplicate" (in its "..." menu;
// `copyOf`, `duplicateRecord`) starts a new record as a copy of that record, beside it (designer, 16 Nov 2026: a control on the record, not
// rows in the Add menu).

import { TYPE_DESCRIPTIONS, eventLabels, hasOwnFrame, eventSections, observationSections, occurrenceSections, siteSections, type EventFields, type RecordKind, type SurveyObservationType, type SurveyOccurrenceType, type SurveyRecord } from "./survey-data";

export const SAMPLING_TYPES = ["Transect", "Quadrat", "Block", "Ramble", "Trap", "Opportune", "Point intercept", "Custom event"] as const;

/** Every event type that can be added inside another event (a Site too, since the sheet of 20 Nov 2026 allows one inside most events). */
const SUB_EVENT_TYPES = ["Site", "Visit", ...SAMPLING_TYPES] as const;

/** The events the business's sheet marks "must have a parent event": never added directly under the project. */
const NEEDS_PARENT_EVENT = ["Visit", "Point intercept"];

/** What each event may hold (the sheet's "Allowed children events"), in one place so every path that creates or moves a record asks the same question. */
const CHILD_EVENTS: Record<string, readonly string[]> = {
  Site: ["Site", "Visit", "Ramble", "Transect", "Block", "Trap", "Custom event", "Opportune", "Point intercept"],
  Visit: ["Site", "Ramble", "Transect", "Trap", "Custom event", "Opportune", "Point intercept"],
  Ramble: ["Site", "Visit", "Transect", "Trap", "Custom event", "Opportune", "Point intercept"],
  Transect: ["Site", "Visit", "Ramble", "Trap", "Custom event", "Opportune", "Point intercept"],
  // The sheet has no Quadrat: it holds what a Transect holds, and sits inside every event but a Point intercept and a Quadrat (see `canContain`).
  Quadrat: ["Site", "Visit", "Ramble", "Trap", "Custom event", "Opportune", "Point intercept"],
  Block: ["Site", "Visit", "Ramble", "Transect", "Trap", "Custom event", "Opportune", "Point intercept"],
  Trap: ["Site", "Visit", "Trap", "Custom event", "Opportune", "Point intercept"],
  "Custom event": ["Site", "Visit", "Ramble", "Transect", "Block", "Trap", "Custom event", "Opportune", "Point intercept"],
  Opportune: ["Visit", "Ramble", "Transect", "Block", "Trap", "Custom event", "Opportune", "Point intercept"],
  "Point intercept": ["Visit", "Custom event"],
};

/**
 * Whether a record of `childKind` and `childType` may sit directly inside `parent` (`null` = the project).
 * Events: under the project unless the sheet says the event must have a parent (a Visit, a Point intercept); inside an event only what that event's type lists
 * (`CHILD_EVENTS`), and a Quadrat (not on the sheet) inside any event but a Point intercept or a Quadrat.
 * Occurrences and observations: under the project or any event; an observation under an occurrence of its own type, and only one.
 */
export function canContain(parent: Pick<SurveyRecord, "kind" | "type"> | null, childKind: RecordKind, childType: string): boolean {
  if (!parent) return !(childKind === "event" && NEEDS_PARENT_EVENT.includes(childType));
  if (parent.kind === "event") {
    if (childKind !== "event") return true;
    // The sheet has no Quadrat. It is kept inside every event but a Point intercept and another Quadrat (the sample data has Quadrats in a Transect).
    if (childType === "Quadrat") return parent.type !== "Point intercept" && parent.type !== "Quadrat";
    return (CHILD_EVENTS[parent.type] ?? []).includes(childType);
  }
  if (parent.kind === "occurrence") return childKind === "observation" && childType === parent.type;
  return false;
}

export interface ChildOption {
  kind: RecordKind;
  type: string;
  label: string;
  description: string;
  /** Set on a record's "Duplicate" (`copyOf`): the record the new one is copied from. */
  duplicateOf?: string;
}

const option = (kind: RecordKind, type: string): ChildOption => ({
  kind,
  type,
  label: kind === "event" ? type : `${type} ${kind}`,
  description: TYPE_DESCRIPTIONS[kind === "event" ? type : `${kind === "occurrence" ? "Occurrence" : "Observation"}:${type}`] ?? "",
});

/** What may be added directly inside `parent` (`null` = the project). */
export function childOptions(parent: SurveyRecord | null, children: SurveyRecord[]): ChildOption[] {
  const records = [
    option("occurrence", "Individual"),
    option("occurrence", "Population"),
    option("observation", "Individual"),
    option("observation", "Population"),
    option("observation", "Non-biotic"),
    option("observation", "Community"),
  ];
  // Directly under the project: every event type that need not have a parent, occurrence and observation.
  if (!parent) return [...SUB_EVENT_TYPES.filter((t) => canContain(null, "event", t)).map((t) => option("event", t)), ...records];
  if (parent.kind === "event") return [...SUB_EVENT_TYPES.filter((t) => canContain(parent, "event", t)).map((t) => option("event", t)), ...records];
  if (parent.kind === "occurrence") {
    // An occurrence carries exactly one observation, of its own type.
    return children.some((c) => c.kind === "observation") ? [] : [option("observation", parent.type)];
  }
  return [];
}

const PREFIX: Record<string, string> = {
  Site: "SU",
  Visit: "VU",
  Transect: "TR",
  Quadrat: "QR",
  Block: "BK",
  Ramble: "RMB",
  Trap: "TRP",
  Opportune: "OP",
  "Point intercept": "PI",
  "Custom event": "CU",
  occurrence: "OC",
  observation: "OB",
};

export function nextCode(kind: RecordKind, type: string, records: SurveyRecord[]): string {
  const prefix = PREFIX[kind === "event" ? type : kind];
  const numbers = records.filter((r) => r.code.startsWith(prefix) && /^\d+$/.test(r.code.slice(prefix.length))).map((r) => Number(r.code.slice(prefix.length)));
  return `${prefix}${String(Math.max(500, ...numbers) + 1).padStart(5, "0")}`;
}

/** The metadata row that holds a record's display name, so renaming keeps the two in step. */
export function nameRow(r: Pick<SurveyRecord, "kind" | "type">): { section: string; label: string } | null {
  if (r.kind === "event") return { section: "details", label: r.type === "Site" ? "Site name" : eventLabels(r.type).name };
  if (r.kind === "occurrence") return { section: "details", label: "Occurrence name" };
  return { section: "details", label: "Observation name" };
}

/**
 * The name a record gets when it is saved without one: its type and a sequence number ("Opportune 1", "Transect 3",
 * "Individual occurrence 2", "Community observation 1"). The number is one more than the records of the same kind and type
 * already in the project, and moves on past a name that is taken (a record deleted from the middle would otherwise repeat one).
 * `record` is left out of the count, so a saved record being named again does not count itself.
 */
export function autoName(record: Pick<SurveyRecord, "id" | "kind" | "type">, records: SurveyRecord[]): string {
  const stem = record.kind === "event" ? record.type : `${record.type} ${record.kind}`;
  const same = records.filter((r) => r.id !== record.id && r.kind === record.kind && r.type === record.type);
  const taken = new Set(same.map((r) => r.name.trim().toLowerCase()));
  let n = same.length + 1;
  while (taken.has(`${stem} ${n}`.toLowerCase())) n += 1;
  return `${stem} ${n}`;
}

/**
 * "Duplicate" on a record: where the copy of `source` would go and the option that starts it, or null when the record cannot have a copy
 * beside it. The copy goes under the source's own parent, so it is allowed exactly when that parent may take another of the same kind and
 * type (`childOptions`): an observation that is its occurrence's only one has no copy (an occurrence carries exactly one), and the control is
 * left out rather than drawn dead (2.12, 3.15). `childrenOf` lists a record's children (`null` = the project).
 */
export function copyOf(
  source: SurveyRecord,
  records: SurveyRecord[],
  childrenOf: (parentId: string | null) => SurveyRecord[],
): { parent: SurveyRecord | null; option: ChildOption } | null {
  const parent = source.parentId ? (records.find((r) => r.id === source.parentId) ?? null) : null;
  const allowed = childOptions(parent, childrenOf(parent?.id ?? null)).find((o) => o.kind === source.kind && o.type === source.type);
  return allowed ? { parent, option: { ...allowed, duplicateOf: source.id } } : null;
}

/**
 * A new record started as a copy of `source`, under `parent`: its fields, dates, location and species are carried; its code, its
 * sequence number and its name are not (the name is left blank, so it is named like any other new record, `autoName`), and
 * nothing inside the source is copied (no children, notes or attachments).
 */
export function duplicateRecord(opts: { source: SurveyRecord; parent: SurveyRecord | null; recordedBy: string; records: SurveyRecord[] }): SurveyRecord {
  const { source, parent, records } = opts;
  const fresh = createRecord({ kind: source.kind, type: source.type, parent, name: "", date: source.date, recordedBy: opts.recordedBy, records });
  const nr = nameRow(source);
  const sections = source.sections.map((s): typeof s => {
    const own = fresh.sections.find((f) => f.id === s.id);
    return {
      ...s,
      rows: s.rows?.map((r) => {
        if (nr && nr.section === s.id && nr.label === r.label) return { ...r, value: "" };
        // What the system sets (the ID, a visit's sequence number) is the new record's own.
        const system = r.type === "system" ? own?.rows?.find((x) => x.label === r.label) : undefined;
        return system ? { ...r, value: system.value } : { ...r };
      }),
      measurements: s.measurements?.map((m) => ({ ...m })),
      trapEffort: s.trapEffort ? JSON.parse(JSON.stringify(s.trapEffort)) : undefined,
      landscape: s.landscape ? JSON.parse(JSON.stringify(s.landscape)) : undefined,
      overstorey: s.overstorey ? JSON.parse(JSON.stringify(s.overstorey)) : undefined,
    };
  });
  return {
    ...fresh,
    date: source.date,
    lat: source.lat,
    lon: source.lon,
    scientificName: source.scientificName,
    family: source.family,
    group: source.group,
    summary: source.summary,
    locationNote: source.locationNote,
    blockKm: source.blockKm,
    location: source.location ? { ...source.location, boundary: source.location.boundary ? { ...source.location.boundary, id: `pt-${fresh.code}` } : source.location.boundary } : fresh.location,
    sections,
  };
}

/** An Opportune or a Point intercept inside another event takes that event's start date when none is given (the frames' note on Temporal: "if not specified inherit from parent"). */
export function inheritsStartDate(r: Pick<SurveyRecord, "kind" | "type" | "parentId">): boolean {
  return r.kind === "event" && hasOwnFrame(r.type) && r.parentId !== null;
}

const NP = "Not provided";
/** A new record with the same sections every record of its kind has, the essentials filled in. */
export function createRecord(opts: {
  kind: RecordKind;
  type: string;
  parent: SurveyRecord | null;
  name: string;
  date: string;
  scientificName?: string;
  recordedBy: string;
  records: SurveyRecord[];
}): SurveyRecord {
  const { kind, type, parent, name, recordedBy, records } = opts;
  const code = nextCode(kind, type, records);
  const lat = parent?.lat ?? -35.02;
  const lon = parent?.lon ?? 138.71;
  // An Opportune or a Point intercept inside an event starts on that event's start date (`inheritsStartDate`).
  const date = kind === "event" && hasOwnFrame(type) && parent?.date ? parent.date : opts.date;
  const base = { id: `new-${code.toLowerCase()}`, code, kind, type: type as SurveyRecord["type"], name, parentId: parent?.id ?? null, date, lat, lon, scientificName: opts.scientificName };

  if (kind === "event" && type === "Site") {
    return {
      ...base,
      summary: "New site",
      sections: siteSections({
        code,
        legacy: NP,
        name,
        lat,
        lon,
        description: NP,
        grouping: NP,
        property: NP,
        altitude: NP,
        mudMap: NP,
        paddock: NP,
        comment: NP,
        dimensions: NP,
        locationComment: NP,
        observers: recordedBy && recordedBy !== NP ? [recordedBy] : [],
        photopoint: { present: "No", disc: NP, direction: NP },
      }),
    };
  }
  if (kind === "event") {
    // A new visit is the next in its site's sequence.
    const siblings = records.filter((r) => r.kind === "event" && r.type === "Visit" && r.parentId === parent?.id).length;
    return {
      ...base,
      summary: `New ${type.toLowerCase()}`,
      // A Point intercept is one coordinate point (the frame's "coordinates only"): a ten metre circle, as an occurrence's point is.
      location: type === "Visit" ? undefined : { method: "coordinates", boundary: { id: `pt-${code}`, kind: "circle", center: [lat, lon], radiusKm: type === "Point intercept" ? 0.01 : 0.1 } },
      sections: eventSections({
        type: type as EventFields["type"],
        code,
        name,
        description: NP,
        sourceId: NP,
        comment: NP,
        seq: `${siblings + 1}/${siblings + 1}`,
        eventArray: NP,
        startDate: date,
        endDate: NP,
        duration: NP,
        dateAccuracy: NP,
        observers: recordedBy && recordedBy !== NP ? [recordedBy] : [],
        lat,
        lon,
        dimensions: NP,
        locationComment: NP,
        photopoint: { present: "No", disc: NP, direction: NP },
        trapEffort: [],
      }),
    };
  }
  const common = {
    code,
    name,
    description: NP,
    comment: NP,
    startDate: date,
    endDate: NP,
    duration: NP,
    dateAccuracy: NP,
    observers: recordedBy && recordedBy !== NP ? [recordedBy] : [],
    lat,
    lon,
    locationComment: NP,
  };
  const pointLocation = { method: "coordinates" as const, boundary: { id: `pt-${code}`, kind: "circle" as const, center: [lat, lon] as [number, number], radiusKm: 0.01 } };
  if (kind === "occurrence") {
    const siblings = records.filter((r) => r.kind === "occurrence" && r.parentId === parent?.id).length;
    return {
      ...base,
      summary: type === "Individual" ? "1 individual" : "Count not recorded",
      location: pointLocation,
      sections: occurrenceSections({ ...common, type: type as SurveyOccurrenceType, legacy: NP, seq: String(siblings + 1), taxonomicType: NP, nsx: NP, status: "Present" }),
    };
  }
  return {
    ...base,
    summary: `New ${type.toLowerCase()} observation`,
    location: pointLocation,
    sections: observationSections({ ...common, type: type as SurveyObservationType }),
  };
}
