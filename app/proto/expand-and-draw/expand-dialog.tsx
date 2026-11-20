"use client";

// The expanded workspace as a dialog that takes the window, and the rules of leaving it: Cancel puts the areas back as they were when it opened (and asks
// first if the switch says to), "Use" keeps them (a shape still waiting to be checked is used with them). Shared by every variant of /proto/expand-and-draw
// that expands. Not product (5.4).

import { useEffect, useState, type ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowLeft, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { DestructiveModal } from "@/components/application/modals/modal";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { TAKEOVER_Z_INDEX } from "@/lib/layers";
import { cx } from "@/utils/cx";
import type { Controller } from "../map-drawing/drawing";
import type { LabConfig } from "./lab-controls";

// Where "the project's place" is, in this lab: a stand-in. In the product it would come from the data owner or a place the person types (still open).
const SAMPLE_PLACE: [number, number] = [-34.93, 138.6];

export function useExpandDialog({ d, config, workspace }: { d: Controller; config: LabConfig; workspace: (d: Controller) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  // The areas as they were when the workspace opened, for Cancel.
  const [saved, setSaved] = useState<Boundary[]>([]);

  // Opening shows what is there: the shape being checked, or the areas, or (with nothing) the whole state or the project's place, as the switch says.
  // A map that was already being used keeps its view (the controller holds it), so expanding does not move the map under the person.
  const { fitAreas, flyTo, view } = d;
  const hasAreas = d.areas.length > 0;
  const startAt = config.start;
  useEffect(() => {
    if (!open || view) return;
    if (hasAreas) {
      const t = setTimeout(fitAreas, 700);
      return () => clearTimeout(t);
    }
    if (startAt === "place") {
      const t = setTimeout(() => flyTo(SAMPLE_PLACE, 10), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = () => {
    setSaved(d.areas);
    setOpen(true);
  };
  const cancel = () => {
    d.setAllAreas(saved);
    setOpen(false);
    setAsking(false);
  };
  const changed = d.pending !== null || JSON.stringify(saved) !== JSON.stringify(d.areas);
  const askOrCancel = () => (config.confirmCancel && changed ? setAsking(true) : cancel());
  const use = () => {
    if (d.pending) d.confirmPending();
    d.cancel();
    setOpen(false);
  };

  const count = d.areas.length + (d.pending ? 1 : 0);
  const status = d.pending ? `A new ${d.pending.kind}, not added yet` : count === 0 ? "Nothing added yet" : `${count} ${count === 1 ? "area" : "areas"}`;

  const dialog = (
    <>
      <ModalOverlay isOpen={open} isDismissable={false} isKeyboardDismissDisabled className={cx("fixed inset-0 bg-overlay", TAKEOVER_Z_INDEX)}>
        <Modal className="fixed inset-0 flex flex-col bg-primary outline-hidden">
          <Dialog aria-label="Draw the project's geographic extent" className="font-barlow flex h-full min-h-0 flex-col outline-hidden">
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-secondary px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="m-0 text-base font-semibold text-primary">Geographic extent</h2>
                <p className="m-0 text-sm text-tertiary tabular-nums">{status}</p>
              </div>
              <div className="flex gap-2">
                <Button color="secondary" size="md" onClick={askOrCancel}>
                  Cancel
                </Button>
                <Button color="primary" size="md" isDisabled={count === 0} onClick={use}>
                  {d.pending ? "Use and finish" : count === 1 ? "Use this area" : "Use these areas"}
                </Button>
              </div>
            </header>
            <div className="min-h-0 flex-1">{open && workspace(d)}</div>
          </Dialog>
        </Modal>
      </ModalOverlay>
      <DestructiveModal
        isOpen={asking}
        onOpenChange={setAsking}
        confirmIcon={Trash01}
        cancelIcon={ArrowLeft}
        title="Discard your changes?"
        description="The areas you added or changed since you opened this will be lost."
        confirmLabel="Discard"
        cancelLabel="Cancel & keep editing"
        footerLayout="column"
        onConfirm={cancel}
      />
    </>
  );
  return { open, start, dialog };
}
