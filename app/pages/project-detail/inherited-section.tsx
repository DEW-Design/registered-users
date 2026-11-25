"use client";

import { Edit05, RefreshCcw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { OVERRIDE_HINT } from "./record-rules";
import { SectionFields } from "./record-panel";
import type { MetaSection, SurveyRecord } from "./survey-data";

// A card an occurrence takes from its parent event, drawn in the edit view (the designer, 18 Nov 2026: "the inherited information must be made obvious
// to the user that the values are inherited, and also allow to override if needed"). The values are the event's, shown shaded and not as fields, with one
// way to make them the occurrence's own. The card's marker, in its header, says where they come from (`InheritedMarker`).

/** The marker beside an inherited card's title: where the values come from. Drawn as the "Hidden" marker is, quiet text, once, in the header. */
export function InheritedMarker({ from }: { from: string }) {
  return <span className="text-xs font-normal text-tertiary">Inherited from {from}</span>;
}

/** The control that gives an overridden card its parent's values back. Named by what it gets. */
export function UseParentButton({ from, onPress }: { from: string; onPress: () => void }) {
  return (
    <Button color="link-color" size="sm" iconLeading={RefreshCcw01} onClick={onPress}>
      Use {from}&apos;s values
    </Button>
  );
}

export function InheritedBody({ record, section, hidden, onOverride }: { record: SurveyRecord; section: MetaSection; hidden: Set<string>; onOverride: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-secondary px-3 py-1">
        <SectionFields record={record} section={section} showMap={false} labelWidth="12rem" hiddenOverride={hidden} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button color="secondary" size="sm" iconLeading={Edit05} onClick={onOverride}>
          Override
        </Button>
        <span className="text-xs text-tertiary text-balance">{OVERRIDE_HINT}</span>
      </div>
    </div>
  );
}
