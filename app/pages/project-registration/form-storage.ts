// Add Project's form state as text, so a created project can live in localStorage. The state holds two
// things JSON cannot carry: calendar dates (`@internationalized/date` values) and a `Set` (the kinds of
// restriction switched on). Each is tagged on the way out and rebuilt on the way in, so everything that
// reads a created project sees exactly the shape the form had. The organisation logo is a temporary
// browser address that does not survive a reload, so it is not kept.

import { parseDate } from "@internationalized/date";
import type { FormState } from "./option-2/sections";

const DATE = "__date";
const SET = "__set";

const isCalendarDate = (v: unknown): v is { year: number; month: number; day: number; toString: () => string } =>
    !!v && typeof v === "object" && "calendar" in v && "year" in v && "month" in v && "day" in v;

export function serializeForm(state: FormState): string {
    const withoutLogo: FormState = { ...state, details: { ...state.details, dataOwnerOrgLogo: null } };
    return JSON.stringify(withoutLogo, (_key, value) => {
        if (isCalendarDate(value)) return { [DATE]: value.toString() };
        if (value instanceof Set) return { [SET]: [...value] };
        return value;
    });
}

export function deserializeForm(json: string): FormState {
    const form = JSON.parse(json, (_key, value) => {
        if (value && typeof value === "object") {
            if (typeof value[DATE] === "string") return parseDate(value[DATE]);
            if (Array.isArray(value[SET])) return new Set(value[SET]);
        }
        return value;
    });
    // A form saved before a project could hold more than one method has `collectionMethod`; it becomes the one entry of `collectionMethods` (19 Nov 2026).
    const c = form?.collection as ({ collectionMethod?: string | null; collectionMethods?: string[] } & Record<string, unknown>) | undefined;
    if (c && !Array.isArray(c.collectionMethods)) {
        c.collectionMethods = c.collectionMethod ? [c.collectionMethod] : [];
        delete c.collectionMethod;
    }
    // Focus areas, permits and the URI / DOI are no longer asked or held (19 Nov 2026: the permit number and the URI / DOI are on the dataset); a form saved with them is read without.
    if (c) for (const field of ["focusAreas", "focusAreaOther", "permits", "uriDoi"]) delete c[field];
    return form;
}

/** A set of section ids (the sections a person has been through), as text. */
export const serializeSet = (set: Set<string>): string => JSON.stringify([...set]);
export const deserializeSet = <T extends string>(raw: string): Set<T> => new Set(JSON.parse(raw) as T[]);
