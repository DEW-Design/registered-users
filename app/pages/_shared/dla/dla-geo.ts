import shp from "shpjs";

// Real geometry helpers for the "Add a Location" modal's Upload Shapefile
// method (easting and northing are converted in `_shared/mga.ts`) - kept separate from dla-data.ts so the record model has no dependency on proj4/shpjs.

function ringToLatLon(ring: number[][]): [number, number][] {
    // GeoJSON coordinates are [lon, lat] - flipped here to match this tool's own [lat, lon] convention.
    return ring.map(([lon, lat]) => [lat, lon]);
}

function firstRingFromGeometry(geometry: GeoJSON.Geometry | undefined): [number, number][] {
    if (!geometry) throw new Error("Couldn't find a shape in this file");
    // A MultiPolygon (and a FeatureCollection's first polygon feature, via parseLocationFile below)
    // is approximated by its first ring only - holes and additional parts are dropped, the same
    // simplification this tool already applies to hand-drawn polygons (see geo.ts's own Boundary
    // type, which has no hole support either).
    if (geometry.type === "Polygon") return ringToLatLon(geometry.coordinates[0]);
    if (geometry.type === "MultiPolygon") return ringToLatLon(geometry.coordinates[0][0]);
    throw new Error("Only polygon shapes are supported");
}

function firstRingFromFeatureCollection(collection: GeoJSON.FeatureCollection): [number, number][] {
    const feature = collection.features[0];
    if (!feature) throw new Error("This file has no shapes in it");
    return firstRingFromGeometry(feature.geometry);
}

/**
 * Parses an uploaded .geojson, bare .shp, or zipped shapefile (.zip containing .shp/.dbf/.prj) into
 * a single boundary polygon - real parsing via shpjs, not a fabricated stand-in. A bare .shp has no
 * attributes and no `.prj`, so `shp.parseShp` assumes the geometry is already WGS84 - the same
 * assumption the wireframe's own instruction to the user states directly ("ensure your shapefile
 * is in WGS84 EPSG:4236... projection").
 */
export async function parseLocationFile(file: File): Promise<[number, number][]> {
    const name = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();

    if (name.endsWith(".geojson") || name.endsWith(".json")) {
        const parsed = JSON.parse(new TextDecoder().decode(buffer)) as GeoJSON.GeoJSON;
        if (parsed.type === "FeatureCollection") return firstRingFromFeatureCollection(parsed);
        if (parsed.type === "Feature") return firstRingFromGeometry(parsed.geometry);
        return firstRingFromGeometry(parsed as GeoJSON.Geometry);
    }

    if (name.endsWith(".zip")) {
        const result = await shp(buffer);
        const collection = Array.isArray(result) ? result[0] : result;
        if (!collection) throw new Error("This shapefile has no layers in it");
        return firstRingFromFeatureCollection(collection);
    }

    if (name.endsWith(".shp")) {
        const geometries = shp.parseShp(buffer);
        return firstRingFromGeometry(geometries[0]);
    }

    throw new Error("Unsupported file - upload a .geojson, .shp, or zipped shapefile (.zip)");
}
