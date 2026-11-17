"use client";

// "Pre-fill sample content" is a Prototype tools switch (design scaffolding). The testing edition has no tools bar and no way to fill
// a form with sample answers, so this hook does nothing: the form opens empty and the participant fills it in. It keeps the signature
// every form already calls, so no form had to change.

/** How a form takes sample files: what they are, how they are added and how the ones the sample added are taken out (by name). */
export interface SampleFiles {
  sample: () => File[] | Promise<File[]>;
  add: (files: File[]) => void;
  remove: (names: string[]) => void;
}

export function useSampleContent<T>(_options: {
  value: T;
  onChange: (next: T) => void;
  sample: () => T;
  enabled?: boolean;
  files?: SampleFiles;
}): number {
  return 0;
}
