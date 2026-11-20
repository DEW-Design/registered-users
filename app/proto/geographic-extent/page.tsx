"use client";

// /proto/geographic-extent: ways to capture a project's geographic extent (Add Project, "Method and details" step's sibling, the
// "Geographic extent" row). One variant at a time, full size, in the form's own row (label left, a 720px field column). The first
// is the picker as it ships, imported live (a "Current" that is a snapshot goes stale). The others are throwaway.
// A lab: it is not product and is not linked from the product (5.4).

import { Suspense, useState } from "react";
import { FormRow } from "@/app/pages/_shared/form-row";
import { GeoExtentPicker } from "@/app/pages/project-registration/geo-extent-picker";
import { emptyGeoExtent, type GeoExtentValue } from "@/app/pages/project-registration/types";
import { ProtoPicker, useProtoVariant } from "../_components/proto-picker";
import { SampleData } from "./shared";
import { AreasVariant } from "./variant-areas";
import { GridVariant } from "./variant-grid";
import { OneBoxVariant } from "./variant-onebox";

function Current() {
  const [value, setValue] = useState<GeoExtentValue>(emptyGeoExtent());
  return <GeoExtentPicker value={value} onChange={setValue} expand="modal" />;
}

const VARIANTS = [
  { name: "Current", node: Current },
  { name: "Areas", node: AreasVariant },
  { name: "Coordinates grid", node: GridVariant },
  { name: "One box", node: OneBoxVariant },
];

function Stage() {
  const [active, setActive] = useProtoVariant(VARIANTS.length);
  const Variant = VARIANTS[active - 1].node;
  return (
    <div className="min-h-screen bg-secondary px-6 py-10 pb-32 font-barlow">
      <div className="mx-auto max-w-[1000px]">
        <p className="m-0 mb-1 text-xs font-semibold tracking-wide text-brand-tertiary uppercase">Lab, not product</p>
        <h1 className="m-0 mb-6 text-xl font-semibold text-primary">Geographic extent: {VARIANTS[active - 1].name}</h1>
        <div className="rounded-xl border border-secondary bg-primary p-6">
          <FormRow title="Geographic extent" required description="The area this project's data collection covers.">
            {/* Keyed so a switch starts the variant afresh. */}
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
