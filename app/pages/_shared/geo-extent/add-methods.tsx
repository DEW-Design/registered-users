"use client";

// The ways of adding an area other than drawing it on the map: choose a place, paste coordinates, or upload a file. One set of tabs in the workspace's panel
// (the design system's underline tabs, with an icon on each, 3.13). A project holds one area, so each of them replaces the area there. Drawing is done on the map.

import { useMemo, useState } from "react";
import { List as ListIcon, Plus, Target04, Upload01 } from "@untitledui/icons";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { InputFile } from "@/components/base/input/input-file";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import type { Controller } from "@/components/custom/draw-map/use-drawing";
import { findListedLocation, useLocationList } from "@/app/pages/_shared/map-search/location-list";
import { DEFAULT_RADIUS_KM, looksLikeCoordinates, newId, parseCoordinates, readAreas } from "./geo-input";

type Method = "place" | "coordinates" | "file";
const METHODS: { id: Method; label: string; icon: typeof ListIcon }[] = [
  { id: "place", label: "Place", icon: ListIcon },
  { id: "coordinates", label: "Coordinates", icon: Target04 },
  { id: "file", label: "File", icon: Upload01 },
];

export function AddMethods({ d }: { d: Controller }) {
  const [method, setMethod] = useState<Method>("place");
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const locations = useLocationList();
  const parsed = useMemo(() => (looksLikeCoordinates(paste) ? parseCoordinates(paste) : { points: [], errors: [] }), [paste]);
  // Three or more points make a polygon; one point is the middle of a circle; two make neither.
  const kind = parsed.points.length >= 3 ? "polygon" : parsed.points.length === 1 ? "circle" : null;

  return (
    <div className="flex flex-col gap-3">
      <Tabs selectedKey={method} onSelectionChange={(k) => setMethod(k as Method)}>
        <TabList aria-label="How to add an area" type="underline" size="sm" fullWidth>
          {METHODS.map((m) => (
            <Tab key={m.id} id={m.id} label={m.label} icon={m.icon} />
          ))}
        </TabList>
      </Tabs>

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
              // The id carries the place, so the extent can say which place it is (the earlier picker's `list-<id>`).
              d.addAreas([{ id: `list-${p.id}`, kind: "circle", center: p.center, radiusKm: 15, label: p.name }]);
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
            isInvalid={parsed.errors.length > 0 || parsed.points.length === 2}
            hint={
              paste.trim() === ""
                ? "Latitude, then longitude. Three or more points make a polygon; one point makes a circle."
                : parsed.errors.length
                  ? parsed.errors.slice(0, 2).join(" ")
                  : parsed.points.length === 2
                    ? "Two points do not make an area. Add one for a circle or three or more for a polygon."
                    : `${parsed.points.length} found.`
            }
          />
          {kind && (
            <Button
              color="primary"
              size="sm"
              iconLeading={Plus}
              className="self-start"
              onClick={() => {
                d.addAreas([kind === "polygon" ? { id: newId("coordinates"), kind, points: parsed.points } : { id: newId("coordinates"), kind, center: parsed.points[0], radiusKm: DEFAULT_RADIUS_KM }]);
                setPaste("");
              }}
            >
              {kind === "polygon" ? "Add as a polygon" : "Add as a circle"}
            </Button>
          )}
        </div>
      )}

      {method === "file" && (
        <InputFile
          label="Shapefile or GeoJSON"
          placeholder="Choose a file"
          acceptedFileTypes={[".geojson", ".json", ".zip", ".shp"]}
          isInvalid={!!fileError}
          hint={fileError ?? "File formats: .geojson or a .shp file. Please ensure your shapefile is in WGS84 EPSG:4326 (latitude, longitude) projection. The area must be less than 25,000km²."}
          onChange={(files) => {
            const list = files ? Array.from(files) : [];
            if (!list.length) return;
            setFileError(null);
            // The first polygon in the file is the area (or a circle round its first point), as the earlier picker read it.
            readAreas(list)
              .then(({ areas }) => (areas.length ? d.addAreas(areas.slice(0, 1)) : setFileError("There is no polygon or point in that file.")))
              .catch((e: unknown) => setFileError(e instanceof Error ? e.message : "We couldn't read that file."));
          }}
        />
      )}
    </div>
  );
}
