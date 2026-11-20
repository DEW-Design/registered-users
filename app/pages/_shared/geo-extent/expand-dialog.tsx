"use client";

// The expanded workspace as a dialog that takes the window, and the rules of leaving it: Cancel puts the area back as it was when it opened (and asks first
// if anything changed), "Use" keeps it (a shape still waiting to be checked is used with it).

import { useEffect, useState, type ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowLeft, CheckCircle, Trash01, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { DestructiveModal } from "@/components/application/modals/modal";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { TAKEOVER_Z_INDEX } from "@/lib/layers";
import { cx } from "@/utils/cx";
import type { Controller } from "@/components/custom/draw-map/use-drawing";

export function useExpandDialog({ d, workspace }: { d: Controller; workspace: (d: Controller) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  // The areas as they were when the workspace opened, for Cancel.
  const [saved, setSaved] = useState<Boundary[]>([]);

  // Opening shows what is there: the area, or (with nothing) the whole state. A map that was already being used keeps its view (the controller holds it),
  // so expanding does not move the map under the person.
  const { fitAreas, view } = d;
  const hasAreas = d.areas.length > 0;
  useEffect(() => {
    if (!open || view || !hasAreas) return;
    const t = setTimeout(fitAreas, 700);
    return () => clearTimeout(t);
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
  const askOrCancel = () => (changed ? setAsking(true) : cancel());
  const use = () => {
    // A waiting shape is used with the area; with none waiting, a part-drawn one is put down.
    if (d.pending) d.confirmPending();
    else d.cancel();
    setOpen(false);
  };

  const count = d.areas.length + (d.pending ? 1 : 0);
  const status = d.pending ? `A new ${d.pending.kind}, not added yet` : count === 0 ? "Nothing added yet" : "1 area";

  const dialog = (
    <>
      <ModalOverlay isOpen={open} isDismissable={false} isKeyboardDismissDisabled className={cx("fixed inset-0 bg-overlay", TAKEOVER_Z_INDEX)}>
        <Modal className="fixed inset-0 flex flex-col bg-primary outline-hidden">
          <Dialog aria-label="Draw the project's geographic extent" className="font-barlow flex h-full min-h-0 flex-col outline-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-secondary px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="m-0 text-base font-semibold text-primary">Geographic extent</h2>
                <p className="m-0 text-sm text-tertiary tabular-nums">{status}</p>
              </div>
              <div className="flex gap-2">
                <Button color="secondary" size="md" iconLeading={XClose} onClick={askOrCancel}>
                  Cancel
                </Button>
                {/* While a shape waits, "Use this area" under the map is the one filled button; this one finishes after it, so it is quiet until nothing is waiting. */}
                <Button color={d.pending ? "secondary" : "primary"} size="md" iconLeading={CheckCircle} isDisabled={count === 0} onClick={use}>
                  {d.pending ? "Use and finish" : "Use this area"}
                </Button>
              </div>
            </div>
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
