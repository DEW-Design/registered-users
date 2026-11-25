"use client";

// What a Save changed on a record, as the field keys the view draws (`${sectionId}:${label}`, the id suffix of each field's row), so the
// view the person returns to can show them (designer, 18 Nov 2026: "when the user hits save changes return back to the view page and
// show/highlight what has been changed"). Compared as the view reads them (`displayValue`), so a value written another way that reads
// the same is not a change.

import { useEffect, type RefObject } from "react";
import { create } from "zustand";
import { displayValue, trapLabels } from "./field-schema";
import { flashElement } from "./flash";
import { LANDSCAPE_SCORE_LABEL } from "./landscape";
import type { SurveyRecord } from "./survey-data";

/** The key of a card's map: where the record is has no field row of its own, so a change of place points at the map. */
export const MAP_FIELD = "*map";

function signatures(record: SurveyRecord): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of record.sections) {
    for (const r of s.rows ?? []) {
      if (r.type === "measurements") continue;
      out.set(`${s.id}:${r.label}`, displayValue(r, s.rows));
    }
    for (const m of s.measurements ?? []) out.set(`${s.id}:${m.type}`, `${m.value}|${m.unit}|${m.method}`);
    if (s.overstorey) {
      out.set(`${s.id}:Canopy type`, s.overstorey.canopyType);
      out.set(`${s.id}:Projected foliage cover`, s.overstorey.foliageCover);
      out.set(`${s.id}:Readings`, JSON.stringify(s.overstorey.readings));
    }
    if (s.landscape) out.set(`${s.id}:${LANDSCAPE_SCORE_LABEL}`, JSON.stringify(s.landscape.inputs));
    if (s.trapEffort) {
      const labels = trapLabels(s.trapEffort);
      s.trapEffort.forEach((e, i) => out.set(`${s.id}:${labels[i]}`, JSON.stringify(e)));
    }
    if (s.withMap) out.set(`${s.id}:${MAP_FIELD}`, JSON.stringify([record.lat, record.lon, record.location ?? null]));
  }
  return out;
}

/** The fields whose value differs between `before` and `after`, in the record's order: added, changed or emptied. */
export function changedFieldKeys(before: SurveyRecord, after: SurveyRecord): string[] {
  const was = signatures(before);
  const now = signatures(after);
  const keys = new Set([...now.keys(), ...was.keys()]);
  return [...keys].filter((k) => was.get(k) !== now.get(k));
}

// What the last Save changed, kept here because the edit and the view it returns to are different components: the details panel
// drops its editor when a Save is done and draws the record's view in its place, so the view cannot be told by the editor's state.
interface SavedChanges {
  recordId: string;
  keys: string[];
  at: number;
}
const useSavedChanges = create<{ last: SavedChanges | null }>(() => ({ last: null }));

/** A Save changed these fields of the record (call before the view is drawn). */
export function publishSavedChanges(recordId: string, keys: string[]) {
  useSavedChanges.setState({ last: keys.length > 0 ? { recordId, keys, at: Date.now() } : null });
}

/** How long after a Save a view that appears still shows what it changed. */
const FRESH_MS = 5000;

/**
 * The view of a record after a Save: opens the cards the changed fields are in (`openCards`), scrolls to the first field and
 * holds the highlight on each long enough to read. Runs once per Save, for whichever view is on screen to receive it.
 */
export function useShowSavedChanges(
  recordId: string | undefined,
  rootRef: RefObject<HTMLElement | null>,
  openCards: (cardIds: string[]) => void,
  active = true,
) {
  const last = useSavedChanges((s) => s.last);
  useEffect(() => {
    if (!active || !last || last.recordId !== recordId) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // setState in a timer, not in the effect body: the view has to be drawn first for there to be anything to find.
    timers.push(
      setTimeout(() => {
        if (Date.now() - last.at > FRESH_MS) return;
        openCards([...new Set(last.keys.map((k) => k.slice(0, k.indexOf(":"))))]);
        timers.push(
          setTimeout(() => {
            const root = rootRef.current;
            if (!root) return;
            const rows = last.keys
              .map((key) => root.querySelector<HTMLElement>(`[id="field-${recordId}-${key}"]`))
              // A field now empty has no row in the view, and a map has none of its own: the card they are in is shown instead.
              .map((el, i) => el ?? root.querySelector<HTMLElement>(`[id="full-card-${last.keys[i].slice(0, last.keys[i].indexOf(":"))}"]`))
              .filter((el): el is HTMLElement => !!el);
            // A card is marked only when none of its own fields is, so one place is not tinted twice.
            const els = [...new Set(rows)].filter((el) => !el.id.startsWith("full-card-") || !rows.some((o) => o !== el && el.contains(o)));
            els.forEach((el, i) => flashElement(el, { scroll: i === 0, hold: 3000 }));
          }, 60),
        );
      }, 340),
    );
    return () => timers.forEach(clearTimeout);
    // `last` is the Save; the callbacks are read as they are when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last, recordId, active]);
}
