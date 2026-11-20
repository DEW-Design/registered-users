"use client";

import { Input } from "@/components/base/input/input";
import type { Acknowledgement } from "@/app/pages/_shared/dataset-upload/acknowledgement-rows";

// The two identifiers a dataset can carry: the permit number it was collected under and its URI or DOI. They were asked when a project was created (as Permits and
// URI / DOI number, under Optional details) and are asked here, under the files, since they belong to the data (the designer, 19 Nov 2026). Both are optional, and
// they are the same two fields where a dataset is added on its own and where it is added while a project is being created (0.9).

export function DatasetIdentifiers({ answers, update }: { answers: Pick<Acknowledgement, "permitNumber" | "uriDoi">; update: (change: Partial<Acknowledgement>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Permit number" value={answers.permitNumber} onChange={(permitNumber) => update({ permitNumber })} />
      <Input
        label="URI / DOI number"
        placeholder="10.5281/zenodo.1234567"
        // The line about an existing identifier is a tooltip on the field, not a line under it (the designer, 19 Nov 2026). It stops there: it no longer adds that a unique ID is generated otherwise (20 Nov 2026).
        tooltip="Enter an existing identifier if known."
        value={answers.uriDoi}
        onChange={(uriDoi) => update({ uriDoi })}
      />
    </div>
  );
}
