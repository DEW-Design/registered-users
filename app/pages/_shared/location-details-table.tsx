"use client";

import { cx } from "@/utils/cx";

// The one "Location Details" coordinate table every record type shows (Projects, Events,
// Occurrences, Observations) - per direct request, one format everywhere: rows Zone / Easting /
// Northing / Latitude / Longitude, columns Coordinate / Entered Value / GDA2020 Equivalent.
//
// Honest values only:
//   - Entered Value: what the record was actually captured as. Every record in this build stores
//     a latitude/longitude, so Latitude/Longitude show it and Zone/Easting/Northing are empty (they
//     weren't entered; no dash, 20 Nov 2026).
//   - GDA2020 Equivalent: the record's coordinates are treated as GDA2020 (the datum this build's
//     own detail pages already state), so Latitude/Longitude carry over unchanged and Zone/
//     Easting/Northing are the real MGA2020 grid position computed from them (`toMga2020`, a
//     standard Transverse Mercator projection on the GRS80 ellipsoid) - derived, not invented.
//   - No coordinates at all (e.g. a mock record with no lat/lon): every cell is empty.

/** Latitude/longitude (GDA2020) -> MGA2020 zone/easting/northing. Transverse Mercator on GRS80,
 *  k0 = 0.9996, 500 km false easting, 10,000 km false northing (southern hemisphere). */
export function toMga2020(lat: number, lon: number): { zone: number; easting: number; northing: number } {
    const a = 6378137;
    const f = 1 / 298.257222101;
    const k0 = 0.9996;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lon0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const lam = (lon * Math.PI) / 180;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const T = Math.tan(phi) ** 2;
    const C = ep2 * Math.cos(phi) ** 2;
    const A = Math.cos(phi) * (lam - lon0);
    const M =
        a *
        ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
            ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
            ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
            ((35 * e6) / 3072) * Math.sin(6 * phi));
    const easting = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
    let northing = k0 * (M + N * Math.tan(phi) * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
    if (lat < 0) northing += 10000000;
    return { zone, easting, northing };
}

// A value and the unit after it, in a slot of the same width on every row, so the decimal points line up down the column whatever the unit is.
interface Cell {
    value: string;
    unit?: string;
}
const metres = (n: number): Cell => ({ value: n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "m" });
const degrees = (n: number): Cell => ({ value: n.toFixed(6) });
// Nothing was entered (or there are no coordinates): the cell is empty, never a dash (2.3, 2.12); a screen reader is told.
const NONE: Cell = { value: "" };

function Value({ cell }: { cell: Cell }) {
    if (!cell.value) return <span className="sr-only">Not entered</span>;
    return (
        <span className="inline-flex items-baseline justify-end gap-1">
            <span>{cell.value}</span>
            <span className="w-3 text-left text-xs text-quaternary">{cell.unit}</span>
        </span>
    );
}

export function LocationDetailsTable({ lat, lon }: { lat?: number; lon?: number }) {
    const has = lat !== undefined && lon !== undefined;
    const mga = has ? toMga2020(lat, lon) : null;
    const rows: { coordinate: string; entered: Cell; gda2020: Cell }[] = [
        { coordinate: "Zone", entered: NONE, gda2020: mga ? { value: String(mga.zone) } : NONE },
        { coordinate: "Easting", entered: NONE, gda2020: mga ? metres(mga.easting) : NONE },
        { coordinate: "Northing", entered: NONE, gda2020: mga ? metres(mga.northing) : NONE },
        { coordinate: "Latitude", entered: has ? degrees(lat) : NONE, gda2020: has ? degrees(lat) : NONE },
        { coordinate: "Longitude", entered: has ? degrees(lon) : NONE, gda2020: has ? degrees(lon) : NONE },
    ];

    return (
        <div className="w-full overflow-x-auto rounded-lg border border-secondary">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-secondary">
                        {/* Matches the real Table.Head convention (components/application/table/table.tsx:
                            text-xs font-semibold text-quaternary), not an ad hoc size/weight for this one
                            hand-rolled table - the two value columns are numeric, so their headers sit
                            right-aligned over the values they label. */}
                        {["Coordinate", "Entered Value", "GDA2020 Equivalent"].map((h, i) => (
                            <th key={h} className={cx("px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-quaternary", i === 0 ? "text-left" : "text-right")}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="[&>tr+tr>td]:border-t [&>tr+tr>td]:border-[var(--ui-border-secondary)] [&>tr:first-child>td]:border-t [&>tr:first-child>td]:border-[var(--ui-border-secondary)]">
                    {rows.map((r) => (
                        <tr key={r.coordinate}>
                            {/* The names recede and the numbers lead: the table is read for its values. */}
                            <td className="px-4 py-2 whitespace-nowrap text-tertiary">{r.coordinate}</td>
                            <td className="px-4 py-2 text-right whitespace-nowrap text-primary tabular-nums">
                                <Value cell={r.entered} />
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap text-primary tabular-nums">
                                <Value cell={r.gda2020} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
