"use client";

// Variant "Areas". Axis: the model. A project's extent is a list of areas, each added by any method, and the methods are buttons
// that add to the list instead of tabs that replace it. So a project can be two polygons, a named place and three points at once.

import { useState } from "react";
import { List as ListIcon, Target04, Upload01, Plus } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputNumber } from "@/components/base/input/input-number";
import { InputFile } from "@/components/base/input/input-file";
import { Select } from "@/components/base/select/select";
import { findListedLocation, useLocationList } from "@/app/pages/_shared/map-search/location-list";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { AreaIcon, AreaMap, DEFAULT_RADIUS_KM, DrawButtons, RemoveButton, areaLine, inSA, newId, readAreas, type DrawTool } from "./shared";

type Panel = "place" | "coordinates" | "file" | null;

export function AreasVariant() {
  const [areas, setAreas] = useState<Boundary[]>([]);
  const [tool, setTool] = useState<DrawTool>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const [lat, setLat] = useState<number>(NaN);
  const [lon, setLon] = useState<number>(NaN);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM);
  const [fileError, setFileError] = useState<string | null>(null);
  const locations = useLocationList();

  const add = (...next: Boundary[]) => setAreas((a) => [...a, ...next]);
  const coordsOk = Number.isFinite(lat) && Number.isFinite(lon) && inSA(lat, lon);
  const toggle = (p: Exclude<Panel, null>) => {
    setTool(null);
    setPanel((cur) => (cur === p ? null : p));
  };
  const polygons = areas.filter((a) => a.kind === "polygon").length;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Add an area">
        <DrawButtons tool={tool} onToolChange={(t) => (setPanel(null), setTool(t))} />
        <Button color={panel === "place" ? "primary" : "secondary"} size="sm" iconLeading={ListIcon} onClick={() => toggle("place")}>
          Choose a place
        </Button>
        <Button color={panel === "coordinates" ? "primary" : "secondary"} size="sm" iconLeading={Target04} onClick={() => toggle("coordinates")}>
          Coordinates
        </Button>
        <Button color={panel === "file" ? "primary" : "secondary"} size="sm" iconLeading={Upload01} onClick={() => toggle("file")}>
          Upload a file
        </Button>
      </div>

      {panel === "place" && (
        <div className="flex items-end gap-3 rounded-lg border border-secondary bg-primary p-3">
          <Select
            label="Place"
            placeholder="Search and select from the list"
            items={locations.map((l) => ({ id: l.id, label: l.name }))}
            selectedKey={placeKey}
            onSelectionChange={(key) => setPlaceKey(key as string)}
            className="min-w-0 flex-1"
          >
            {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
          </Select>
          <Button
            color="primary"
            size="md"
            iconLeading={Plus}
            isDisabled={!placeKey || !findListedLocation(locations, placeKey)?.center}
            onClick={() => {
              const place = findListedLocation(locations, placeKey);
              if (!place?.center) return;
              add({ id: newId("list"), kind: "circle", center: place.center, radiusKm: 15, label: place.name });
              setPlaceKey(null);
            }}
          >
            Add place
          </Button>
        </div>
      )}

      {panel === "coordinates" && (
        <form
          className="grid grid-cols-[1fr_1fr_8rem_auto] items-end gap-3 rounded-lg border border-secondary bg-primary p-3 max-sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!coordsOk) return;
            add({ id: newId("coord"), kind: "circle", center: [lat, lon], radiusKm: radius });
            setLat(NaN);
            setLon(NaN);
          }}
        >
          <InputNumber label="Latitude" placeholder="-34.93" step={0.01} minValue={-38} maxValue={-25} value={lat} onChange={setLat} />
          <InputNumber label="Longitude" placeholder="138.60" step={0.01} minValue={129} maxValue={141} value={lon} onChange={setLon} />
          <InputNumber label="Radius (km)" value={radius} minValue={1} maxValue={300} step={5} onChange={setRadius} />
          <Button type="submit" color="primary" size="md" iconLeading={Plus} isDisabled={!coordsOk}>
            Add point
          </Button>
        </form>
      )}

      {panel === "file" && (
        <div className="rounded-lg border border-secondary bg-primary p-3">
          <InputFile
            label="Shapefile or GeoJSON"
            placeholder="Choose a file"
            acceptedFileTypes={[".geojson", ".json", ".zip", ".shp"]}
            isInvalid={!!fileError}
            hint={fileError ?? "Every polygon and point in the file is added as its own area. WGS84 (EPSG:4326), or a .zip with its .prj."}
            onChange={(files) => {
              const list = files ? Array.from(files) : [];
              if (!list.length) return;
              setFileError(null);
              readAreas(list)
                .then(({ areas: found }) => {
                  if (!found.length) return setFileError("There is no polygon or point in that file.");
                  add(...found);
                  setPanel(null);
                })
                .catch((e: unknown) => setFileError(e instanceof Error ? e.message : "We couldn't read that file."));
            }}
          />
        </div>
      )}

      <AreaMap
        areas={areas}
        tool={tool}
        onToolChange={setTool}
        onAdd={(b) => add(b)}
        highlighted={hover ? new Set([hover]) : undefined}
        onAreaHover={setHover}
      />

      <div role="status" className="flex min-h-9 items-center justify-between gap-3">
        {areas.length === 0 ? (
          <p className="m-0 text-sm text-tertiary">No areas yet. Draw one, choose a place, enter coordinates or upload a file. Add as many as the project covers.</p>
        ) : (
          <>
            <p className="m-0 text-sm font-medium text-primary tabular-nums">
              {areas.length} {areas.length === 1 ? "area" : "areas"}
              <span className="font-normal text-tertiary">
                {" "}
                ({polygons} {polygons === 1 ? "polygon" : "polygons"}, {areas.length - polygons} {areas.length - polygons === 1 ? "circle" : "circles"})
              </span>
            </p>
            <Button color="tertiary" size="sm" onClick={() => setAreas([])}>
              Remove all
            </Button>
          </>
        )}
      </div>

      {areas.length > 0 && (
        <ul className="m-0 flex max-h-72 list-none flex-col overflow-y-auto rounded-lg border border-secondary bg-primary p-0">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 border-b border-secondary px-3 py-1.5 last:border-b-0 hover:bg-primary_hover"
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <AreaIcon b={a} />
              <span className="min-w-0 flex-1 truncate text-sm text-primary" title={areaLine(a)}>
                {areaLine(a)}
              </span>
              <RemoveButton label={`Remove ${areaLine(a)}`} onClick={() => setAreas((all) => all.filter((x) => x.id !== a.id))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
