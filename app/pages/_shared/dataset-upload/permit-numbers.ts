"use client";

import { useMemo } from "react";
import type { Dataset } from "@/app/pages/_shared/dataset-upload/dataset-data";
import { useDatasets } from "@/app/pages/_shared/dataset-upload/dataset-store";
import { SAMPLE_DATASETS } from "@/app/pages/_shared/dataset-upload/sample-datasets";

// A permit number belongs to a dataset (it is asked under the files on the upload form). The project shows the permit numbers of its datasets, rolled up: each
// number once, in the order the datasets were uploaded, the oldest first (the designer, 19 Nov 2026).

/** The permit numbers of a project's datasets, each once, the oldest dataset first. `stored` is the datasets uploaded in this browser; the project's sample uploads are added. */
export function permitNumbersOf(stored: Dataset[], projectId: string): string[] {
  const numbers = [...SAMPLE_DATASETS, ...stored]
    .filter((d) => d.projectId === projectId && d.permitNumber?.trim())
    .sort((a, b) => (a.uploadedAt === b.uploadedAt ? a.id.localeCompare(b.id) : a.uploadedAt.localeCompare(b.uploadedAt)))
    .map((d) => d.permitNumber!.trim());
  return [...new Set(numbers)];
}

export function usePermitNumbers(projectId: string): string[] {
  const stored = useDatasets();
  return useMemo(() => permitNumbersOf(stored, projectId), [stored, projectId]);
}
