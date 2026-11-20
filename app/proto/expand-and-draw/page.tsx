"use client";

// /proto/expand-and-draw: "Expand and draw" (the designer, 18 Nov 2026: "What if we say expand and draw? Then it would make more sense?"). The form holds a
// summary and a button; the drawing is done in a workspace that takes the window. Round 2 of /proto/map-drawing. The first variant is the product's picker with its
// own Expand (imported live); the others are throwaway. A lab: not product, and not linked from the product (5.4).

import { Suspense, useState } from "react";
import { FormRow } from "@/app/pages/_shared/form-row";
import { GeoExtentPicker } from "@/app/pages/project-registration/geo-extent-picker";
import { emptyGeoExtent, type GeoExtentValue } from "@/app/pages/project-registration/types";
import { ProtoPicker, useProtoVariant } from "../_components/proto-picker";
import { SampleData } from "../geographic-extent/shared";
import { ExpandAndDraw } from "./shell";
import { MapFirst } from "./map-first";
import { HybridWorkspace } from "./workspace-hybrid";
import { DEFAULT_CONFIG, LabControls, type LabConfig } from "./lab-controls";
import { SplitWorkspace } from "./workspace-split";

function Current() {
  const [value, setValue] = useState<GeoExtentValue>(emptyGeoExtent());
  return <GeoExtentPicker value={value} onChange={setValue} expand="modal" />;
}

type VariantProps = { config: LabConfig };
const VARIANTS: { name: string; node: (p: VariantProps) => React.ReactNode }[] = [
  { name: "Current", node: () => <Current /> },
  { name: "Map first", node: ({ config }) => <MapFirst config={config} /> },
  { name: "Summary, Hybrid", node: ({ config }) => <ExpandAndDraw config={config} workspace={(d) => <HybridWorkspace d={d} single={config.areas === "one"} />} /> },
  { name: "Summary, Split", node: ({ config }) => <ExpandAndDraw config={config} workspace={(d) => <SplitWorkspace d={d} single={config.areas === "one"} />} /> },
];

function Stage() {
  const [active, setActive] = useProtoVariant(VARIANTS.length);
  const Variant = VARIANTS[active - 1].node;
  const [config, setConfig] = useState<LabConfig>(DEFAULT_CONFIG);
  return (
    <div className="min-h-screen bg-secondary px-6 py-10 pb-32 font-barlow">
      <div className="mx-auto max-w-[1000px]">
        <p className="m-0 mb-1 text-xs font-semibold tracking-wide text-brand-tertiary uppercase">Lab, not product</p>
        <h1 className="m-0 mb-6 text-xl font-semibold text-primary">Expand and draw: {VARIANTS[active - 1].name}</h1>
        <div className="rounded-xl border border-secondary bg-primary p-6">
          <FormRow title="Geographic extent" required description="The area this project's data collection covers.">
            {/* Keyed so a switch, or a change of one-or-several, starts the variant afresh. */}
            <Variant key={`${active}-${config.areas}`} config={config} />
          </FormRow>
        </div>
        <SampleData />
      </div>
      <LabControls config={config} onChange={setConfig} />
      {/* At the top: the workspace has its own bar along the bottom, which the pill would sit over. */}
      <ProtoPicker names={VARIANTS.map((v) => v.name)} active={active} onChange={setActive} position="top" />
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
