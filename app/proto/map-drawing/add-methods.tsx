"use client";

// The four ways of adding an area, as one set of tabs in a panel: draw it, choose a place, paste coordinates, or upload a file. Each adds to the same
// list of areas the map shows, so the methods can be mixed. Used by the "Split" workspace of /proto/expand-and-draw. Not product (5.4).

import { useMemo, useState } from "react";
import { List as ListIcon, Map01, Plus, Target04, Upload01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { InputFile } from "@/components/base/input/input-file";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { findListedLocation, useLocationList } from "@/app/pages/_shared/map-search/location-list";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { looksLikeCoordinates, newId, parseCoordinates, readAreas } from "../geographic-extent/shared";
import type { Controller } from "./drawing";
import { DrawingActions, GoTo, LivePoints, ToolButtons, instruction, liveLine } from "./ui";

type Method = "draw" | "place" | "coordinates" | "file";
const METHODS: { id: Method; label: string; icon: typeof Map01 }[] = [
  { id: "draw", label: "Draw", icon: Map01 },
  { id: "place", label: "Place", icon: ListIcon },
  { id: "coordinates", label: "Coordinates", icon: Target04 },
  { id: "file", label: "File", icon: Upload01 },
];

export function AddMethods({ d, draw = true }: { d: Controller; draw?: boolean }) {
  const [method, setMethod] = useState<Method>(draw ? "draw" : "place");
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const locations = useLocationList();
  const parsed = useMemo(() => (looksLikeCoordinates(paste) ? parseCoordinates(paste) : { points: [], errors: [] }), [paste]);

  return (
    <div className="flex flex-col gap-3">
      {/* The design system's tabs (underline, with an icon on each, 3.13), not a lookalike. */}
      <Tabs selectedKey={method} onSelectionChange={(k) => (k !== "draw" && d.startTool(null), setMethod(k as Method))}>
        <TabList aria-label="How to add an area" type="underline" size="sm" fullWidth>
          {METHODS.filter((m) => draw || m.id !== "draw").map((m) => (
            <Tab key={m.id} id={m.id} label={m.label} icon={m.icon} />
          ))}
        </TabList>
      </Tabs>

      {method === "draw" && (
        <div className="flex flex-col gap-3">
          <GoTo d={d} />
          {d.tool ? (
            <>
              <div className="flex flex-col gap-1">
                <p role="status" className="m-0 text-sm text-balance text-tertiary">
                  {instruction(d)}
                </p>
                <p className="m-0 text-sm font-semibold text-primary tabular-nums">{liveLine(d)}</p>
              </div>
              <LivePoints d={d} />
              <DrawingActions d={d} />
            </>
          ) : (
            <>
              <ToolButtons d={d} />
              <p className="m-0 text-sm text-balance text-tertiary">Pick a shape, then click the map. Go to a place first to get close.</p>
            </>
          )}
        </div>
      )}

      {method === "place" && (
        <div className="flex flex-col gap-3">
          <Select label="Place" placeholder="Search and select from the list" items={locations.map((l) => ({ id: l.id, label: l.name }))} selectedKey={placeKey} onSelectionChange={(k) => setPlaceKey(k as string)}>
            {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
          </Select>
          <Button
            color="primary"
            size="sm"
            iconLeading={Plus}
            className="self-start"
            isDisabled={!placeKey || !findListedLocation(locations, placeKey)?.center}
            onClick={() => {
              const p = findListedLocation(locations, placeKey);
              if (!p?.center) return;
              d.addAreas([{ id: newId("list"), kind: "circle", center: p.center, radiusKm: 15, label: p.name }]);
              d.flyTo(p.center, 10);
              setPlaceKey(null);
            }}
          >
            Add place
          </Button>
        </div>
      )}

      {method === "coordinates" && (
        <div className="flex flex-col gap-3">
          <TextArea
            label="Coordinates, one point a line"
            placeholder={"-35.45, 138.80\n-35.40, 139.05"}
            rows={5}
            value={paste}
            onChange={setPaste}
            isInvalid={parsed.errors.length > 0}
            hint={paste.trim() === "" ? "Latitude, then longitude. Paste as many as you have." : parsed.errors.length ? parsed.errors.slice(0, 2).join(" ") : `${parsed.points.length} found.`}
          />
          <div className="flex flex-wrap gap-2">
            {parsed.points.length >= 3 && (
              <Button color="primary" size="sm" iconLeading={Plus} onClick={() => (d.addAreas([{ id: newId("coords"), kind: "polygon", points: parsed.points }]), setPaste(""))}>
                Add as one area
              </Button>
            )}
            {parsed.points.length >= 1 && (
              <Button
                color={parsed.points.length >= 3 ? "secondary" : "primary"}
                size="sm"
                iconLeading={Plus}
                onClick={() => (d.addAreas(parsed.points.map((c): Boundary => ({ id: newId("pt"), kind: "circle", center: c, radiusKm: 25 }))), setPaste(""))}
              >
                Add as {parsed.points.length === 1 ? "a point" : `${parsed.points.length} points`}
              </Button>
            )}
          </div>
        </div>
      )}

      {method === "file" && (
        <InputFile
          label="Shapefile or GeoJSON"
          placeholder="Choose a file"
          acceptedFileTypes={[".geojson", ".json", ".zip", ".shp"]}
          isInvalid={!!fileError}
          hint={fileError ?? "Every polygon and point in the file is added. WGS84 (EPSG:4326), or a .zip with its .prj."}
          onChange={(files) => {
            const list = files ? Array.from(files) : [];
            if (!list.length) return;
            setFileError(null);
            readAreas(list)
              .then(({ areas }) => (areas.length ? d.addAreas(areas) : setFileError("There is no polygon or point in that file.")))
              .catch((e: unknown) => setFileError(e instanceof Error ? e.message : "We couldn't read that file."));
          }}
        />
      )}
    </div>
  );
}
