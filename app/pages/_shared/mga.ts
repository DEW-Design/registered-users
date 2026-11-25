import proj4 from "proj4";

// MGA (Map Grid of Australia) easting and northing to and from latitude and longitude. A grid position is only a
// place with its zone: South Australia spans zones 52, 53 and 54 (129 to 141 degrees east), so every conversion
// carries one. Kept apart from `dla/dla-geo.ts` (which pulls in the shapefile reader) so a form that only takes
// coordinates does not load it.

/** The MGA zones South Australia spans, west to east. */
export const MGA_ZONES = [52, 53, 54] as const;

const mgaZone = (zone: number) => `+proj=utm +zone=${zone} +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`;

/** MGA easting and northing to [latitude, longitude]. */
export function mgaToLatLon(zone: number, easting: number, northing: number): [number, number] {
    const [lon, lat] = proj4(mgaZone(zone), proj4.WGS84, [easting, northing]);
    return [lat, lon];
}
