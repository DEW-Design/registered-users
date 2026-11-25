"use client";

// "Change type" on a saved event (designer, 19 Nov 2026): pick the type it should be, from the ones the business's table allows in its place
// (record-rules.ts `eventTypeChoices`). The event keeps its ID, place, children and every value the new type also has; what the new type has no
// field for is named first and confirmed in a red modal, as any loss is (CONTRACTS 3.12), and is only removed on that confirm.
// One answer, so no Pre-fill sample content switch (CONTRACTS 3.14: a dialog with one answer is not covered).

import { useState } from "react";
import { ArrowLeft, SwitchHorizontal02, Trash01 } from "@untitledui/icons";
import { DestructiveModal, FormModal } from "@/components/application/modals/modal";
import { toast } from "@/components/application/toast/toast";
import { Select } from "@/components/base/select/select";
import { useEditStore } from "./edit-store";
import { eventTypeChoices, inheritersLosing, retypeEvent } from "./record-rules";
import { TYPE_DESCRIPTIONS, type SurveyRecord } from "./survey-data";

/** "Start time and Dimensions" / "Start time, Dimensions and Observers": a list of labels as a phrase. */
const phrase = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export function ChangeTypeModal({ record, onClose, onChanged }: { record: SurveyRecord; onClose: () => void; onChanged?: (record: SurveyRecord) => void }) {
  const store = useEditStore();
  const [type, setType] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const children = store.childrenOf(record.id);
  const choices = eventTypeChoices(record, store.recordById(record.parentId) ?? null, children);
  const preview = type ? retypeEvent(record, type, store.records) : null;

  const apply = () => {
    if (!type) return;
    const next = store.changeEventType(record.id, type);
    if (!next) {
      toast.error("That type can't be used here", { description: `${record.name} stays ${record.type}.` });
      return onClose();
    }
    // A record inside that took a card from this event reads it from the event above now: said once, where the change is reported.
    const readers = inheritersLosing(type, children).length;
    toast.success(`${next.name} changed to ${type}`, {
      description: readers > 0 ? `${readers} record${readers === 1 ? "" : "s"} inside it now take${readers === 1 ? "s" : ""} the dates, observers or location from the event above.` : "Changes are kept in this browser. This preview has no backend.",
    });
    onChanged?.(next);
    onClose();
  };

  const submit = () => {
    setTried(true);
    if (!type || !preview) return;
    if (preview.lost.length > 0) setConfirm(true);
    else apply();
  };

  return (
    <>
      <FormModal
        isOpen={!confirm}
        onOpenChange={(open) => !open && onClose()}
        icon={SwitchHorizontal02}
        title="Change event type"
        description={`${record.name} (${record.type}). Its ID, its place in the project and the records inside it stay as they are.`}
        submitLabel="Change type"
        submitIcon={SwitchHorizontal02}
        onSubmit={submit}
      >
        <Select
          label="New type"
          isRequired
          // The hint below says what is missing once Change type is pressed; the browser's own check would block the press and say nothing.
          validationBehavior="aria"
          placeholder="Select a type"
          items={choices.map((t) => ({ id: t, label: t, supportingText: TYPE_DESCRIPTIONS[t] }))}
          selectedKey={type}
          onSelectionChange={(key) => key && setType(String(key))}
          isInvalid={tried && !type}
          hint={tried && !type ? "Choose the type this event should be." : undefined}
        >
          {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
        </Select>
      </FormModal>
      <DestructiveModal
        isOpen={confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(false);
        }}
        title={`Change to ${type ?? ""} and remove ${preview?.lost.length === 1 ? "a value" : "some values"}?`}
        description={`${type ?? ""} has no ${phrase(preview?.lost ?? [])}. What was entered there is removed and can't be brought back. Everything else carries over.`}
        confirmLabel={`Change to ${type ?? ""}`}
        confirmIcon={Trash01}
        cancelLabel="Keep as it is"
        cancelIcon={ArrowLeft}
        onConfirm={apply}
      />
    </>
  );
}
