"use client";

// Variant "One box". Axis: intent. There is no choice of method up front: one field takes a place name, a pasted list of coordinates or a
// dropped file, works out which it is, and offers the one thing that fits. Drawing stays beside it. What is added is a row of areas.

import { useMemo, useRef, useState } from "react";
import { Plus, Upload01, Target04, MarkerPin01, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { findListedLocation, useLocationList } from "@/app/pages/_shared/map-search/location-list";
import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { cx } from "@/utils/cx";
import { AreaIcon, AreaMap, DEFAULT_RADIUS_KM, DrawButtons, areaLine, looksLikeCoordinates, newId, parseCoordinates, readAreas, type DrawTool } from "./shared";

export function OneBoxVariant() {
  const [areas, setAreas] = useState<Boundary[]>([]);
  const [tool, setTool] = useState<DrawTool>(null);
  const [text, setText] = useState("");
  const [over, setOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const locations = useLocationList();

  const add = (...next: Boundary[]) => setAreas((a) => [...a, ...next]);
  const query = text.trim();
  const isCoords = looksLikeCoordinates(text);
  const parsed = useMemo(() => (isCoords ? parseCoordinates(text) : { points: [], errors: [] }), [isCoords, text]);
  const places = useMemo(() => {
    if (!query || isCoords) return [];
    const q = query.toLowerCase();
    return locations.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, isCoords, locations]);

  const readFiles = (list: File[]) => {
    if (!list.length) return;
    setFileError(null);
    readAreas(list)
      .then(({ areas: found }) => (found.length ? add(...found) : setFileError("There is no polygon or point in that file.")))
      .catch((e: unknown) => setFileError(e instanceof Error ? e.message : "We couldn't read that file."));
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className={cx("flex flex-col gap-3 rounded-xl border border-dashed p-3 transition-colors duration-150", over ? "border-brand bg-brand-primary" : "border-secondary bg-primary")}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          readFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <TextArea
          aria-label="Place or coordinates"
          rows={2}
          placeholder="Search a place, or paste coordinates"
          value={text}
          onChange={setText}
          className="[&_textarea]:resize-none"
        />

        {/* What the box found. One thing fits, and the button says what it will do. */}
        <div role="status" aria-live="polite" className="flex flex-col gap-1">
          {places.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-primary_hover">
              <MarkerPin01 className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{p.name}</span>
              <Button
                color="secondary"
                size="sm"
                iconLeading={Plus}
                isDisabled={!findListedLocation(locations, p.id)?.center}
                onClick={() => {
                  if (!p.center) return;
                  add({ id: newId("list"), kind: "circle", center: p.center, radiusKm: 15, label: p.name });
                  setText("");
                }}
              >
                Add
              </Button>
            </div>
          ))}
          {query && !isCoords && places.length === 0 && <p className="m-0 px-2 text-sm text-tertiary">No place called &ldquo;{query}&rdquo; in the list.</p>}

          {isCoords && (
            <div className="flex flex-col gap-2 rounded-lg bg-secondary p-3">
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-primary tabular-nums">
                <Target04 className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
                {parsed.points.length} {parsed.points.length === 1 ? "coordinate" : "coordinates"} found
              </p>
              {parsed.errors.length > 0 && (
                <p className="m-0 text-xs text-error-primary">
                  {parsed.errors.slice(0, 2).join(" ")}
                  {parsed.errors.length > 2 ? ` And ${parsed.errors.length - 2} more.` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {parsed.points.length >= 3 && (
                  <Button
                    color="primary"
                    size="sm"
                    iconLeading={Plus}
                    onClick={() => {
                      add({ id: newId("coords"), kind: "polygon", points: parsed.points });
                      setText("");
                    }}
                  >
                    Add as one area
                  </Button>
                )}
                {parsed.points.length >= 1 && (
                  <Button
                    color={parsed.points.length >= 3 ? "secondary" : "primary"}
                    size="sm"
                    iconLeading={Plus}
                    onClick={() => {
                      add(...parsed.points.map((c): Boundary => ({ id: newId("pt"), kind: "circle", center: c, radiusKm: DEFAULT_RADIUS_KM })));
                      setText("");
                    }}
                  >
                    Add as {parsed.points.length === 1 ? "a point" : `${parsed.points.length} points`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-secondary pt-3">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".geojson,.json,.zip,.shp"
            multiple
            onChange={(e) => {
              readFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <Button color="secondary" size="sm" iconLeading={Upload01} onClick={() => fileRef.current?.click()}>
            Choose a file
          </Button>
          <p className="m-0 min-w-0 flex-1 text-sm text-tertiary">Or drop a shapefile or GeoJSON here. Every polygon and point in it is added.</p>
        </div>
        {fileError && (
          <p role="alert" className="m-0 text-sm text-error-primary">
            {fileError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 text-sm text-tertiary">Or draw it:</p>
        <DrawButtons tool={tool} onToolChange={setTool} />
      </div>

      {areas.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Areas added">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex max-w-full items-center gap-2 rounded-full border border-secondary bg-primary py-1 pr-1 pl-3 text-sm text-primary"
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <AreaIcon b={a} />
              <span className="min-w-0 truncate" title={areaLine(a)}>
                {areaLine(a)}
              </span>
              <Button color="tertiary" size="sm" iconLeading={XClose} aria-label={`Remove ${areaLine(a)}`} className="rounded-full" onClick={() => setAreas((all) => all.filter((x) => x.id !== a.id))} />
            </li>
          ))}
        </ul>
      )}

      <AreaMap areas={areas} tool={tool} onToolChange={setTool} onAdd={(b) => add(b)} highlighted={hover ? new Set([hover]) : undefined} onAreaHover={setHover} />
      <p role="status" className="m-0 min-h-5 text-sm text-tertiary tabular-nums">
        {areas.length === 0 ? "Nothing added yet." : `${areas.length} ${areas.length === 1 ? "area" : "areas"} added.`}
      </p>
    </div>
  );
}
