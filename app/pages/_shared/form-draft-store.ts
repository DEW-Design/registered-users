"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage, useHydrated, useRehydrate } from "@/app/pages/_shared/zustand-persist";

// A form's answers, kept in a zustand store persisted to localStorage (the same plumbing as the other stores here, zustand-persist.ts), so a form that is part way
// through is still there after a refresh (the designer, 19 Nov 2026). One store holds every form's draft, each under its own key, as text: the form says how it is
// written (`encode`) and read back (`decode`), because some hold what JSON cannot (calendar dates, a Set; form-storage.ts).
//
// - A draft is written only once the person has changed something, so opening a form and leaving it leaves nothing behind.
// - It is read once, after the first render (the store is created with `skipHydration`), so the first paint matches the server's. `restored` says one was found.
// - It is cleared when the form is finished or discarded (`clear`), and a form that cannot be read any more (it changed shape) is dropped and starts empty.
// - Not kept: files (a File cannot be stored). A form with files keeps the rest.

interface FormDraftState {
  drafts: Record<string, string>;
}

const useDraftStore = create<FormDraftState>()(
  persist(() => ({ drafts: {} as Record<string, string> }), {
    name: "biodata-form-drafts",
    version: 1,
    storage: createJSONStorage(browserStorage),
    skipHydration: true,
  }),
);

const writeDraft = (key: string, raw: string | null) =>
  useDraftStore.setState((s) => {
    const drafts = { ...s.drafts };
    if (raw === null) delete drafts[key];
    else drafts[key] = raw;
    return { drafts };
  });

export function useFormDraft<T>({ key, initial, encode, decode }: { key: string; initial: () => T; encode: (value: T) => string; decode: (raw: string) => T }) {
  const [value, setValue] = useState<T>(initial);
  const [touched, setTouched] = useState(false);
  const [restored, setRestored] = useState(false);
  const [looked, setLooked] = useState(false);
  useRehydrate(useDraftStore);
  const hydrated = useHydrated(useDraftStore);

  // Read once, as soon as the store has read localStorage.
  if (hydrated && !looked) {
    setLooked(true);
    const raw = useDraftStore.getState().drafts[key];
    if (raw !== undefined) {
      try {
        setValue(decode(raw));
        setRestored(true);
      } catch {
        writeDraft(key, null);
      }
    }
  }

  // Written after a change the person made.
  useEffect(() => {
    if (touched) writeDraft(key, encode(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, touched, key]);

  const set = useCallback((next: SetStateAction<T>) => {
    setTouched(true);
    setValue(next);
  }, []);
  const clear = useCallback(() => {
    setTouched(false);
    writeDraft(key, null);
  }, [key]);

  return { value, set, clear, restored };
}
