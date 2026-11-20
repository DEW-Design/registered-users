// Reading what a person gives for an area: pasted coordinates, and a shapefile or GeoJSON. Pure: no React, no map.

import type { Boundary } from "@/app/pages/_shared/map-search/geo";
import { parseShapefileUpload } from "@/app/pages/_shared/map-search/shapefile";

/** Radius of a single point given by coordinates or found in a file: the registration form's own (25 km), as the earlier picker used. */
export const DEFAULT_RADIUS_KM = 25;

let counter = 0;
/** An id for an area. The prefix says how it was made (draw, list, shp, coordinates), and the extent's method is read back from it. */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter++}`;

/** South Australia's box, as the product's coordinates fields bound it. */
const SA_LAT: [number, number] = [-38, -25];
const SA_LON: [number, number] = [129, 141];
const inSA = (lat: number, lon: number) => lat >= SA_LAT[0] && lat <= SA_LAT[1] && lon >= SA_LON[0] && lon <= SA_LON[1];

export type ParsedCoords = { points: [number, number][]; errors: string[] };

/** Reads pasted coordinates: one point a line, "lat, lon" or "lat lon" (a "lon, lat" pair is turned round when only that way sits inside South Australia). */
export function parseCoordinates(text: string): ParsedCoords {
  const points: [number, number][] = [];
  const errors: string[] = [];
  text
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) return;
      const nums = line.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
      if (!nums || nums.length !== 2) return void errors.push(`Line ${i + 1}: expected a latitude and a longitude`);
      const [a, b] = nums;
      if (inSA(a, b)) points.push([a, b]);
      else if (inSA(b, a)) points.push([b, a]);
      else errors.push(`Line ${i + 1}: ${a}, ${b} is outside South Australia`);
    });
  return { points, errors };
}

/** Whether pasted text is worth reading as coordinates (two or more numbers on a line). */
export const looksLikeCoordinates = (text: string) => /-?\d+\.\d+\s*[,\s]\s*-?\d+\.\d+/.test(text);

/** A file read for real: every polygon and point in it, polygons first (so the first area is a polygon when the file has one). */
export async function readAreas(files: File[], radiusKm = DEFAULT_RADIUS_KM): Promise<{ areas: Boundary[]; name: string; skipped: number }> {
  const layer = await parseShapefileUpload(files);
  const id = newId("shp");
  const areas: Boundary[] = [
    ...layer.polygons.map((points, i): Boundary => ({ id: `${id}-p${i}`, kind: "polygon", points, label: layer.name })),
    ...layer.points.map((center, i): Boundary => ({ id: `${id}-c${i}`, kind: "circle", center, radiusKm, label: layer.name })),
  ];
  return { areas, name: layer.name, skipped: layer.skipped };
}
