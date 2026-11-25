"use client";

// One way to ask for a place by its coordinates, wherever the product does: a radio to choose what is given,
// Latitude and Longitude or Easting and Northing (with the MGA zone a grid position needs), and the fields for the
// choice. Whatever is entered, the caller only ever holds latitude and longitude, so a record, a boundary and a
// search all read one value. Easting and northing are converted as they are entered; switching the choice carries
// the place over (a latitude and longitude shows as its grid position, and the other way round).
//
// Built from the design system's RadioGroup, Select and InputNumber, and used by Add Project's geographic extent,
// the Add a location modal, a point intercept's location, the survey record form and Explore's coordinate search.

import { useState } from "react";
import { InputNumber } from "@/components/base/input/input-number";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { toMga2020 } from "./location-details-table";
import { MGA_ZONES, mgaToLatLon } from "./mga";

type System = "latlong" | "eastingnorthing";

interface Draft {
    lat: number | null;
    lon: number | null;
    zone: number;
    easting: number | null;
    northing: number | null;
}

const DEFAULT_ZONE = 54;

const given = (n: number | null | undefined): n is number => n != null && Number.isFinite(n);
const near = (a: number | null, b: number | null) => (a == null || b == null ? a === b : Math.abs(a - b) < 1e-6);

/** A draft from a latitude and longitude: the grid position is worked out from them, or left empty where there is no place yet. */
function draftFrom(lat: number | null, lon: number | null, zone = DEFAULT_ZONE): Draft {
    if (!given(lat) || !given(lon)) return { lat: given(lat) ? lat : null, lon: given(lon) ? lon : null, zone, easting: null, northing: null };
    const mga = toMga2020(lat, lon);
    const inSa = (MGA_ZONES as readonly number[]).includes(mga.zone);
    return { lat, lon, zone: inSa ? mga.zone : zone, easting: inSa ? Math.round(mga.easting) : null, northing: inSa ? Math.round(mga.northing) : null };
}

/** Up to 6 decimals, about 10 cm: a position worked out from a grid position is shown as it is. */
const DEGREE_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 6 };
/** A grid position is whole metres, never "270,000". */
const METRE_FORMAT: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 0 };

export function CoordinateFields({
    lat,
    lon,
    onChange,
    size = "md",
    step = 0.00001,
    isRequired,
    latHint,
    lonHint,
    className,
}: {
    /** The place held by the caller. `null` (or NaN) is not given yet. */
    lat: number | null;
    lon: number | null;
    /** Called with both as soon as both are given, and with `null` for each while one is missing, whichever system is being used. */
    onChange: (lat: number | null, lon: number | null) => void;
    size?: "sm" | "md";
    /** The step for latitude and longitude, in degrees. A number field shows and snaps to its step, so it is also the precision kept: the default, 0.00001, is about a metre, so a position converted from an easting and northing is shown as it is. */
    step?: number;
    /** Marks every field required (`*`). */
    isRequired?: boolean;
    /** What the latitude and longitude fields are called in the data (a Darwin Core term), shown under them. A grid position has no such term, so its fields carry none. */
    latHint?: string;
    lonHint?: string;
    className?: string;
}) {
    const [system, setSystem] = useState<System>("latlong");
    const [draft, setDraft] = useState<Draft>(() => draftFrom(given(lat) ? lat : null, given(lon) ? lon : null));
    const [seen, setSeen] = useState<{ lat: number | null; lon: number | null }>({ lat: given(lat) ? lat : null, lon: given(lon) ? lon : null });

    // The caller changed the place (a reset, a shape drawn on the map, the sample content): the fields follow, unless
    // it is only what was just entered coming back.
    const propLat = given(lat) ? lat : null;
    const propLon = given(lon) ? lon : null;
    if (!near(seen.lat, propLat) || !near(seen.lon, propLon)) {
        setSeen({ lat: propLat, lon: propLon });
        const bothGiven = given(draft.lat) && given(draft.lon);
        if (!(bothGiven ? near(draft.lat, propLat) && near(draft.lon, propLon) : propLat == null && propLon == null)) {
            setDraft(draftFrom(propLat, propLon, draft.zone));
        }
    }

    const commit = (next: Draft) => {
        setDraft(next);
        const complete = given(next.lat) && given(next.lon);
        onChange(complete ? next.lat : null, complete ? next.lon : null);
    };

    const setDegrees = (patch: Partial<Pick<Draft, "lat" | "lon">>) => {
        const lat = "lat" in patch ? patch.lat! : draft.lat;
        const lon = "lon" in patch ? patch.lon! : draft.lon;
        commit(draftFrom(given(lat) ? lat : null, given(lon) ? lon : null, draft.zone));
    };

    const setGrid = (patch: Partial<Pick<Draft, "zone" | "easting" | "northing">>) => {
        const next = { ...draft, ...patch };
        if (given(next.easting) && given(next.northing)) {
            const [la, lo] = mgaToLatLon(next.zone, next.easting, next.northing);
            commit({ ...next, lat: la, lon: lo });
        } else {
            commit({ ...next, lat: null, lon: null });
        }
    };

    const nan = (n: number | null) => (given(n) ? n : NaN);

    return (
        <div className={cx("flex flex-col gap-3", className)}>
            <RadioGroup size="sm" orientation="horizontal" value={system} onChange={(v) => setSystem(v as System)} aria-label="Coordinate system">
                <RadioButton value="latlong" label="Latitude & Longitude" />
                <RadioButton value="eastingnorthing" label="Easting & Northing" />
            </RadioGroup>

            {system === "latlong" ? (
                <div className="grid grid-cols-2 items-start gap-3">
                    <InputNumber
                        size={size}
                        label="Latitude"
                        isRequired={isRequired}
                        hint={latHint}
                        placeholder="-34.93"
                        step={step}
                        formatOptions={DEGREE_FORMAT}
                        minValue={-38}
                        maxValue={-25}
                        value={nan(draft.lat)}
                        onChange={(v) => setDegrees({ lat: Number.isFinite(v) ? v : null })}
                    />
                    <InputNumber
                        size={size}
                        label="Longitude"
                        isRequired={isRequired}
                        hint={lonHint}
                        placeholder="138.60"
                        step={step}
                        formatOptions={DEGREE_FORMAT}
                        minValue={129}
                        maxValue={141}
                        value={nan(draft.lon)}
                        onChange={(v) => setDegrees({ lon: Number.isFinite(v) ? v : null })}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-[6rem_1fr_1fr] items-start gap-3">
                    <Select
                        size={size}
                        label="Zone"
                        isRequired={isRequired}
                        items={MGA_ZONES.map((z) => ({ id: String(z), label: String(z) }))}
                        selectedKey={String(draft.zone)}
                        onSelectionChange={(key) => key && setGrid({ zone: Number(key) })}
                    >
                        {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
                    </Select>
                    <InputNumber
                        size={size}
                        label="Easting"
                        isRequired={isRequired}
                        placeholder="270000"
                        step={1}
                        formatOptions={METRE_FORMAT}
                        minValue={100000}
                        maxValue={900000}
                        value={nan(draft.easting)}
                        onChange={(v) => setGrid({ easting: Number.isFinite(v) ? v : null })}
                    />
                    <InputNumber
                        size={size}
                        label="Northing"
                        isRequired={isRequired}
                        placeholder="6130000"
                        step={1}
                        formatOptions={METRE_FORMAT}
                        minValue={5500000}
                        maxValue={7500000}
                        value={nan(draft.northing)}
                        onChange={(v) => setGrid({ northing: Number.isFinite(v) ? v : null })}
                    />
                </div>
            )}
        </div>
    );
}
