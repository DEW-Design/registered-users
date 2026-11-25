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
// The sheet calls a Trap a "Trap Array" and a Custom event "Custom"; it has no Quadrat, which follows Transect on both sides (the
// designer, 18 Nov 2026). Two cells carry a "?" in the sheet (a Trap Array inside a Ramble and inside a Transect); they are allowed as
// listed until the business confirms.
//
// Opportune and Point intercept have their own frames (survey-data.ts `frameEventSections`): a start date left empty is inherited
// from the parent event (`inheritsStartDate`), a Point intercept's location is one coordinate point, and Location comment is compulsory.
//
// A record added without a name is named by its species (an occurrence) or by its type and ID (`autoName`), and a record's "Duplicate" (in its "..." menu;
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

/** The event types that may sit directly inside an event of `parentType`, or directly under the project when `parentType` is `null`: the same rule as
 *  `canContain`, as a list (the event-type change and the Add menus ask it this way). */
export function allowedChildEvents(parentType: string | null): string[] {
  const parent = parentType === null ? null : ({ kind: "event", type: parentType } as Pick<SurveyRecord, "kind" | "type">);
  return SUB_EVENT_TYPES.filter((t) => canContain(parent, "event", t));
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

// ── Changing an event's type after it is saved (the designer, 19 Nov 2026) ──
// An event keeps its place, its ID, its children and what it has recorded; it takes the new type's layout. Which types it may become
// is the same table that decides what may be added: the parent must be allowed to hold the new type, and the new type must be allowed to
// hold every event already inside. Values carry over by field (Darwin Core term, else label), so a "Transect name" becomes a "Ramble name"
// and Observers moves with its term wherever the new type keeps it. Whatever the new type has no field for is listed, never dropped quietly.

/** The event types `record` may be changed to: allowed under its parent, and able to hold the events inside it. Empty for anything that is not an event. */
export function eventTypeChoices(record: Pick<SurveyRecord, "kind" | "type">, parent: SurveyRecord | null, children: SurveyRecord[]): string[] {
  if (record.kind !== "event") return [];
  return SUB_EVENT_TYPES.filter(
    (t) => t !== record.type && canContain(parent, "event", t) && children.every((c) => c.kind !== "event" || allowedChildEvents(t).includes(c.type)),
  );
}

const EMPTY_VALUES = ["", "Not provided", "None recorded"];
const isEmptyValue = (v: string | undefined) => EMPTY_VALUES.includes((v ?? "").trim());

/** A label with the type's own words made neutral, so "Transect name" and "Ramble name" are the same field. */
function canonLabel(type: string, label: string): string {
  const l = eventLabels(type);
  if (label === l.name) return "{name}";
  if (label === l.comment) return "{comment}";
  if (label === `${l.noun} ID`) return "{id}";
  return label;
}

export interface Retyped {
  /** The record as the new type lays it out. */
  record: SurveyRecord;
  /** What the record had entered that the new type has no field for, by the label a person knows it by ("Trap effort", "Start time"). */
  lost: string[];
  /** The notes and attachments that moved with a field whose label changed or that moved to another card: old field key to new field key. */
  rekeyed: Record<string, string>;
}

/**
 * `record` as an event of `type`: the new type's sections, with every value the two have in common carried over, and the ID, place, dates and
 * children unchanged. `records` is every record in the project (the new type's sequence number, if it has one, is worked out from it).
 */
export function retypeEvent(record: SurveyRecord, type: string, records: SurveyRecord[]): Retyped {
  const parent = records.find((r) => r.id === record.parentId) ?? null;
  const fresh = createRecord({ kind: "event", type, parent, name: record.name, date: record.date, recordedBy: "", records: records.filter((r) => r.id !== record.id) });
  const was = record.type;
  const pool = record.sections.flatMap((s) => (s.rows ?? []).map((row) => ({ sid: s.id, row, key: canonLabel(was, row.label), used: false })));
  const rekeyed: Record<string, string> = {};

  const sections = fresh.sections.map((sec): typeof sec => {
    const rows = sec.rows?.map((row) => {
      if (row.type === "system") return canonLabel(type, row.label) === "{id}" ? { ...row, value: record.code } : row;
      const key = canonLabel(type, row.label);
      const same = (o: (typeof pool)[number]) => (!!row.term && o.row.term === row.term) || o.key === key;
      const hit = pool.find((o) => !o.used && o.sid === sec.id && same(o)) ?? pool.find((o) => !o.used && same(o));
      if (!hit) return row;
      hit.used = true;
      const from = `${hit.sid}:${hit.row.label}`;
      const to = `${sec.id}:${row.label}`;
      if (from !== to) rekeyed[from] = to;
      return { ...row, value: hit.row.value };
    });
    // The parts of a card that are not rows (trap effort, landscape scores, site scores) go with the card when the new type has it too.
    const old = record.sections.find((s) => s.id === sec.id);
    return {
      ...sec,
      rows,
      ...(old?.trapEffort && sec.trapEffort ? { trapEffort: old.trapEffort } : {}),
      ...(old?.landscape && sec.landscape ? { landscape: old.landscape } : {}),
      ...(old?.siteScores && sec.siteScores ? { siteScores: old.siteScores } : {}),
    };
  });

  // What the old type had that the new one has nowhere to put: a value somebody entered, so not one the system or the location works out, and not
  // the answer every new record of the old type starts with ("Photopoint marker present: No").
  const untouched = new Map(
    createRecord({ kind: "event", type: was, parent, name: "", date: record.date, recordedBy: "", records: [] }).sections.flatMap((s) => (s.rows ?? []).map((r) => [`${s.id}:${r.label}`, r.value] as const)),
  );
  const lost = [
    ...pool
      .filter((o) => !o.used && o.row.type !== "system" && o.row.type !== "derived" && !isEmptyValue(o.row.value) && untouched.get(`${o.sid}:${o.row.label}`) !== o.row.value)
      .map((o) => o.row.label),
    ...record.sections.flatMap((s) => {
      const kept = sections.find((x) => x.id === s.id);
      const out: string[] = [];
      if (s.trapEffort && s.trapEffort.length > 0 && !kept?.trapEffort) out.push(s.title);
      if (s.landscape && Object.values(s.landscape.inputs).some((v) => v != null && String(v).trim() !== "") && !kept?.landscape) out.push(s.title);
      if (s.siteScores && !kept?.siteScores && JSON.stringify(s.siteScores) !== JSON.stringify(createRecord({ kind: "event", type: "Site", parent: null, name: "", date: "", recordedBy: "", records: [] }).sections.find((x) => x.id === "scores")?.siteScores)) out.push(s.title);
      return out;
    }),
  ];

  // A Visit has no location of its own. A Point intercept is one coordinate point (the frame's "coordinates only").
  const point = { method: "coordinates" as const, boundary: { id: `pt-${record.code}`, kind: "circle" as const, center: [record.lat, record.lon] as [number, number], radiusKm: type === "Point intercept" ? 0.01 : 0.1 } };
  let location: SurveyRecord["location"];
  if (type === "Visit") location = undefined;
  else if (type === "Point intercept" && record.location && record.location.boundary?.kind !== "circle") {
    location = point;
    lost.push("Location shape");
  } else location = record.location ?? point;
  if (type === "Visit" && record.location) lost.push("Location");

  return {
    record: { ...record, type: type as SurveyRecord["type"], summary: /^New /.test(record.summary) ? fresh.summary : record.summary, location, sections },
    lost: [...new Set(lost)],
    rekeyed,
  };
}

/** The records directly inside an event that take a card from it (temporal details, observers, location) which an event of `type` has no card for: they will read it from the event above instead. */
export function inheritersLosing(type: string, children: SurveyRecord[]): SurveyRecord[] {
  const fresh = createRecord({ kind: "event", type, parent: null, name: "", date: "", recordedBy: "", records: [] });
  const has = (id: string) => (id === "observers" ? hasObservers(fresh) : fresh.sections.some((s) => s.id === id));
  return children.filter((r) => (r.inherits ?? []).some((id) => !has(id)));
}

/** The metadata row that holds a record's display name, so renaming keeps the two in step. */
export function nameRow(r: Pick<SurveyRecord, "kind" | "type">): { section: string; label: string } | null {
  if (r.kind === "event") return { section: "details", label: r.type === "Site" ? "Site name" : eventLabels(r.type).name };
  if (r.kind === "occurrence") return { section: "details", label: "Occurrence name" };
  return { section: "details", label: "Observation name" };
}

/**
 * The name a record gets when it is saved without one (designer, 17 Nov 2026: names are optional): an occurrence is named by its
 * species (the scientific name), and any other record by its type and its ID ("Transect SU00501", "Individual observation OB00012").
 */
export function autoName(record: Pick<SurveyRecord, "kind" | "type" | "code" | "scientificName">): string {
  if (record.kind === "occurrence" && record.scientificName?.trim()) return record.scientificName.trim();
  const stem = record.kind === "event" ? record.type : `${record.type} ${record.kind}`;
  return `${stem} ${record.code}`;
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

// ── What an occurrence takes from its parent event (the designer, 18 Nov 2026) ──
// "The inherited information must be made obvious to the user, and allow to override if needed. We will not store these inherited details
// twice but just pull them from the parent." An occurrence added under an event starts with that event's Temporal details, Observers and
// Location information. It does not hold them: `inherits` names the sections that are the event's, they are read from the event when the
// record is shown (`resolveInherited`, applied once, in the edit store), and a person who overrides one enters that section's own values,
// which are then stored on the occurrence like any other.

/** The sections an occurrence may take from its parent event. */
export const INHERITABLE = ["temporal", "observers", "location"];
/** What the Override button is for, beside it (the designer's words). */
export const OVERRIDE_HINT = "Only fill out if you wish to define more precisely than the parent event fields";

type Lookup = (id: string | null | undefined) => SurveyRecord | undefined;

const hasObservers = (r: SurveyRecord) => r.sections.some((s) => s.rows?.some((row) => row.term === "recordedBy"));
const owns = (r: SurveyRecord, sectionId: string) => (sectionId === "observers" ? hasObservers(r) : r.sections.some((s) => s.id === sectionId));

/**
 * The event a section is taken from: the nearest event above the record that has it itself. A Visit has no location, so an occurrence in
 * a Visit takes its location from the Site above it; a Trap has no observers, so the same walk finds them higher up. None above has it: undefined.
 */
export function inheritanceSource(sectionId: string, record: Pick<SurveyRecord, "parentId">, byId: Lookup): SurveyRecord | undefined {
  for (let p = byId(record.parentId); p; p = byId(p.parentId)) {
    if (p.kind === "event" && owns(p, sectionId) && !p.inherits?.includes(sectionId)) return p;
  }
  return undefined;
}

/** The sections that this record's ancestors can supply: what a person can inherit, or override, here. */
export function inheritableSections(record: Pick<SurveyRecord, "parentId">, sections: { id: string }[], byId: Lookup): string[] {
  return INHERITABLE.filter((id) => sections.some((s) => s.id === id) && inheritanceSource(id, record, byId));
}

const NP_VALUE = "Not provided";

/** `target` with the section `sectionId` taken from `source`: its rows by label, and the record-level date, coordinates and shape that go with it. */
export function copySection(target: SurveyRecord, source: SurveyRecord, sectionId: string): SurveyRecord {
  const rowsOf = (r: SurveyRecord) => (sectionId === "observers" ? r.sections.flatMap((x) => x.rows ?? []).filter((row) => row.term === "recordedBy") : (r.sections.find((x) => x.id === sectionId)?.rows ?? []));
  const from = rowsOf(source);
  const sections = target.sections.map((sec) =>
    sec.id !== sectionId
      ? sec
      : { ...sec, rows: sec.rows?.map((row) => { const hit = from.find((f) => (sectionId === "observers" ? f.term === row.term : f.label === row.label)); return hit ? { ...row, value: hit.value } : row; }) },
  );
  const out = { ...target, sections };
  if (sectionId === "temporal") return { ...out, date: source.date };
  if (sectionId === "location") return { ...out, lat: source.lat, lon: source.lon, location: source.location };
  return out;
}

/** The record as it reads: each inherited section filled from the event it comes from, as the event is now. Anything else is returned as it is. */
export function resolveInherited(record: SurveyRecord, byId: Lookup): SurveyRecord {
  if (!record.inherits?.length) return record;
  return record.inherits.reduce((out, id) => {
    const source = inheritanceSource(id, record, byId);
    return source ? copySection(out, source, id) : out;
  }, record);
}

/** `record` as it is stored: the sections it inherits are emptied (the event holds them) and named in `inherits`. */
export function withInherits(record: SurveyRecord, ids: string[]): SurveyRecord {
  const blank = (sec: SurveyRecord["sections"][number]) => ({ ...sec, rows: sec.rows?.map((row) => ({ ...row, value: NP_VALUE })) });
  return {
    ...record,
    inherits: ids,
    ...(ids.includes("location") ? { location: undefined } : {}),
    sections: record.sections.map((sec) => (ids.includes(sec.id) ? blank(sec) : sec)),
  };
}

/**
 * What a new occurrence's edit starts as (the designer, 18 Nov 2026: "unless methodology defines otherwise, collapse everything except
 * occurrence details"). Under an event, the sections it can take are inherited, and shown as inherited; Voucher and Custom properties fold.
 * `own` is what the project's methodology asks each occurrence to record itself: those start entered and open. An occurrence directly
 * under the project has no event to take from, so nothing folds and nothing is inherited.
 */
export function occurrenceStart(record: SurveyRecord, byId: Lookup, own: ReadonlySet<string> = new Set()): { inherit: string[]; folded: string[]; record: SurveyRecord } {
  const parent = byId(record.parentId);
  if (!parent || parent.kind !== "event") return { inherit: [], folded: [], record };
  const can = inheritableSections(record, record.sections, byId);
  const filled = can.reduce((r, id) => copySection(r, inheritanceSource(id, r, byId) as SurveyRecord, id), record);
  const inherit = can.filter((id) => !own.has(id));
  const folded = record.sections.filter((s) => s.id !== "details" && !own.has(s.id)).map((s) => s.id);
  return { inherit, folded, record: { ...filled, inherits: inherit } };
}
