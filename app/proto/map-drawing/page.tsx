"use client";

// /proto/map-drawing: the flow of drawing an area on the map, select an option, draw, see the coordinates (the designer, 18 Nov 2026: "doesn't
// seem to flow"). A second round on /proto/geographic-extent's "Areas": the first is that variant as it is, imported live; the others are throwaway.
// One variant at a time, in the form's own row. A lab: not product, and not linked from the product (5.4).

import { Suspense } from "react";
import { FormRow } from "@/app/pages/_shared/form-row";
import { ProtoPicker, useProtoVariant } from "../_components/proto-picker";
import { AreasVariant } from "../geographic-extent/variant-areas";
import { SampleData } from "../geographic-extent/shared";
import { PanelVariant } from "./variant-panel";
import { HudVariant } from "./variant-hud";
import { ConfirmVariant } from "./variant-confirm";

const VARIANTS = [
  { name: "Current", node: AreasVariant },
  { name: "Panel", node: PanelVariant },
  { name: "On the map", node: HudVariant },
  { name: "Check it first", node: ConfirmVariant },
];

function Stage() {
  const [active, setActive] = useProtoVariant(VARIANTS.length);
  const Variant = VARIANTS[active - 1].node;
  return (
    <div className="min-h-screen bg-secondary px-6 py-10 pb-32 font-barlow">
      <div className="mx-auto max-w-[1000px]">
        <p className="m-0 mb-1 text-xs font-semibold tracking-wide text-brand-tertiary uppercase">Lab, not product</p>
        <h1 className="m-0 mb-6 text-xl font-semibold text-primary">Drawing an area: {VARIANTS[active - 1].name}</h1>
        <div className="rounded-xl border border-secondary bg-primary p-6">
          <FormRow title="Geographic extent" required description="The area this project's data collection covers.">
            <Variant key={active} />
          </FormRow>
        </div>
        <SampleData />
      </div>
      <ProtoPicker names={VARIANTS.map((v) => v.name)} active={active} onChange={setActive} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Stage />
    </Suspense>
  );
}
