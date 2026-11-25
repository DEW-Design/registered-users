"use client";

import { useSyncExternalStore } from "react";
import { GitBranch01 } from "@untitledui/icons";
import { useRegisterTool } from "./tools";

// Which way the project page adds an occurrence (CONTRACTS 4.4, 1.6): a Prototype tools choice, so both can be shown from the page that ships.
//   Option 1  as it is: every card in edit mode, starting from today's date and the current observer.
//   Option 2  inherited: Occurrence details open, the rest folded, and Temporal details, Observers and Location information read from the
//             parent event, marked as inherited, with Override (the designer, 18 Nov 2026; built first as the lab /proto/occurrence-add).
// In the prototype Option 1 is the default and the bar chooses. This edition has no bar, and the designer chose the inherited way for it (25 Nov 2026), so Option 2 is
// the default here and the stored choice is only read, never offered. The choice is kept in localStorage, like the sample-content
// switch, so it holds across the tabs and records of a project and a refresh. Scaffold (CONTRACTS 1.5, 3.8): it previews the product, it is not product.

export type AddOccurrenceOption = "1" | "2";

const STORAGE_KEY = "biodata-prototype-add-occurrence-option";
const listeners = new Set<() => void>();

const read = (): AddOccurrenceOption => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1" ? "1" : "2";
  } catch {
    return "2";
  }
};

// Storage can be blocked, so the choice also lives in memory for the visit.
let current: AddOccurrenceOption | null = null;
const value = () => (current ??= read());

const choose = (next: AddOccurrenceOption) => {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not kept past this visit.
  }
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const OPTIONS = [
  { id: "1", label: "Option 1", description: "Every card open, as it is today" },
  { id: "2", label: "Option 2", description: "Occurrence details open, the rest folded; the event's details inherited, marked, with Override" },
];

/** The way an occurrence is added now. Puts the "Add occurrence" choice on the bar while `enabled` (a role that can add records, on the screen that adds them). */
export function useAddOccurrenceOption(enabled: boolean): AddOccurrenceOption {
  const option = useSyncExternalStore(subscribe, value, () => "2" as AddOccurrenceOption);
  useRegisterTool(
    enabled
      ? {
          id: "layout",
          label: "Adding an occurrence",
          barLabel: "Add occurrence",
          barValue: `Option ${option} of ${OPTIONS.length}`,
          icon: GitBranch01,
          options: OPTIONS,
          value: option,
          onChange: (id) => choose(id === "2" ? "2" : "1"),
        }
      : null,
  );
  return option;
}
