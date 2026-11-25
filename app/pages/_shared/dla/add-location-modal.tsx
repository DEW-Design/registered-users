"use client";

import { useState, type FC } from "react";
import { List as ListIcon, Map01, MarkerPin02, Plus, Target04, Upload01, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { InputFile } from "@/components/base/input/input-file";
import { Select } from "@/components/base/select/select";
import { Dialog, Modal, ModalFooter, ModalHeader, ModalOverlay } from "@/components/application/modals/modal";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import type { Boundary, DrawTool } from "@/app/pages/_shared/map-search/geo";
import { DrawStatusLine, DrawToolButtons } from "@/app/pages/_shared/map-search/draw-tool-buttons";
import { ExpandableMap } from "@/app/pages/_shared/map-search/expandable-map";
import { useLocationList } from "@/app/pages/_shared/map-search/location-list";
import { CoordinateFields } from "@/app/pages/_shared/coordinate-fields";
import { parseLocationFile } from "@/app/pages/_shared/dla/dla-geo";
import { newLocationId, type DlaLocation, type DlaLocationMethod } from "@/app/pages/_shared/dla/dla-data";

// The wireframe's "Add a Location" popup (Figma YMproGZfrFB5jUqPHPxMhk, node 33:43259), re-fitted
// to real components rather than its own drag-and-drop chrome - see context/decisions/2026-09-23-03-data-licencing-agreement-dla-workflow-built-at-pages.md, "Data Licencing
// Agreement (DLA)". 3 of its 4 methods reuse exactly what Explore's own map search already built
// for the same job (draw on the map, enter coordinates, pick a real South Australian national
// park) - a location added here becomes the same `Boundary` (circle/polygon) type Explore uses, so
// `SAMap` needs no new rendering path. Upload Shapefile is the one genuinely new piece: a real
// shpjs parse (see dla-geo.ts), not a fake progress bar.
//
// The License Category (Level 2/3) radio and, for Level 3, the project checklist are NOT part of
// this modal - the wireframe places them on each already-added location row in the parent step,
// not inside "Add a Location" itself, so this modal only ever produces a location's name/method/
// geometry; the caller assigns a default level and lets the requester change it afterward.

// The same icons as the shared picker (project-registration/geo-extent-picker.tsx), one per method (the designer, 25 Oct 2026).
const methodTabs: { id: DlaLocationMethod; label: string; icon: FC<{ className?: string }> }[] = [
    { id: "map", label: "Draw on the Map", icon: Map01 },
    { id: "list", label: "Choose from a List", icon: ListIcon },
    { id: "coordinates", label: "Coordinates", icon: Target04 },
    { id: "shapefile", label: "Upload Shapefile", icon: Upload01 },
];


// A single point (entered coordinates, or a park's own centroid) becomes a small fixed-radius
// circle boundary, same shape as every other boundary this tool produces - there's nothing in the
// wireframe's Coordinates/Choose-from-a-list panels to size a radius from, unlike Explore's own
// coordinate entry (which asks for one).
const PARK_RADIUS_KM = 15;
const POINT_RADIUS_KM = 1;

export function AddLocationModal({ isOpen, onOpenChange, onAdd }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onAdd: (location: DlaLocation) => void }) {
    const [method, setMethod] = useState<DlaLocationMethod>("map");
    const [name, setName] = useState("");

    const [drawnBoundary, setDrawnBoundary] = useState<Boundary | null>(null);
    const [activeDrawTool, setActiveDrawTool] = useState<DrawTool | null>(null);
    const [selectedParkId, setSelectedParkId] = useState<string | null>(null);

    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);

    const [shapefileName, setShapefileName] = useState("");
    const [shapefilePoints, setShapefilePoints] = useState<[number, number][] | null>(null);
    const [shapefileError, setShapefileError] = useState("");
    const [isParsing, setIsParsing] = useState(false);

    const locations = useLocationList();
    const selectedPark = locations.find((place) => place.id === selectedParkId);

    const boundary: Boundary | null =
        method === "map"
            ? drawnBoundary
            : method === "list" && selectedPark?.center
              ? { id: `list-${selectedPark.id}`, kind: "circle", center: selectedPark.center, radiusKm: PARK_RADIUS_KM }
              : method === "coordinates"
                ? coordinatesBoundary(lat, lon)
                : method === "shapefile" && shapefilePoints
                  ? { id: "shapefile", kind: "polygon", points: shapefilePoints }
                  : null;

    const resolvedName = method === "list" ? (selectedPark?.name ?? "") : name.trim();
    const canAdd = !!boundary && resolvedName.length > 0;

    const reset = () => {
        setMethod("map");
        setName("");
        setDrawnBoundary(null);
        setActiveDrawTool(null);
        setSelectedParkId(null);
        setLat(null);
        setLon(null);
        setShapefileName("");
        setShapefilePoints(null);
        setShapefileError("");
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) reset();
        onOpenChange(open);
    };

    const handleAdd = () => {
        if (!boundary) return;
        onAdd({ id: newLocationId(), name: resolvedName, method, boundary, level: "level2", projectIds: [] });
        handleOpenChange(false);
    };

    const handleFileChange = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        setShapefileError("");
        setShapefileName(file.name);
        setShapefilePoints(null);
        setIsParsing(true);
        try {
            const points = await parseLocationFile(file);
            setShapefilePoints(points);
        } catch (error) {
            setShapefileError(error instanceof Error ? error.message : "Couldn't read this file");
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={handleOpenChange}>
            <Modal className="w-full max-w-2xl">
                <Dialog>
                    <ModalHeader icon={MarkerPin02} iconColor="gray" title="Add a location" description="Name the area, then draw it, pick it, upload it or enter its coordinates." />
                    <div className="flex flex-col gap-5 px-6 pt-5">

                        <Tabs selectedKey={method} onSelectionChange={(key) => setMethod(key as DlaLocationMethod)} className="flex flex-col gap-4">
                            <TabList aria-label="Location method" type="button-border" size="sm" fullWidth>
                                {methodTabs.map((m) => (
                                    <Tab key={m.id} id={m.id} label={m.label} icon={m.icon} />
                                ))}
                            </TabList>

                            <TabPanel id="shapefile" className="flex flex-col gap-4">
                                <Input label="Specify a Location Name" isRequired value={name} onChange={setName} />
                                <InputFile
                                    label="Upload a shapefile"
                                    placeholder={shapefileName || "Choose a file"}
                                    buttonText="Browse"
                                    acceptedFileTypes={[".geojson", ".shp", ".zip"]}
                                    isLoading={isParsing}
                                    isInvalid={!!shapefileError}
                                    hint={
                                        shapefileError ||
                                        "File formats: .geojson, .shp, or a zipped shapefile (.zip). Ensure your shapefile is in WGS84 (latitude, longitude) projection."
                                    }
                                    onChange={handleFileChange}
                                />
                                {shapefilePoints && !shapefileError && <p className="text-xs text-tertiary">Parsed {shapefilePoints.length} boundary points from {shapefileName}.</p>}
                            </TabPanel>

                            <TabPanel id="map" className="flex flex-col gap-4">
                                <Input label="Specify a Location Name" isRequired value={name} onChange={setName} />
                                <DrawToolButtons activeDrawTool={activeDrawTool} onDrawToolChange={setActiveDrawTool} />
                                <DrawStatusLine boundary={drawnBoundary} activeDrawTool={activeDrawTool} onRemove={() => setDrawnBoundary(null)} />
                                <ExpandableMap
                                    title={name.trim() || "Draw a location"}
                                    presentation="takeover"
                                    overModal
                                    toolbar={<DrawToolButtons activeDrawTool={activeDrawTool} onDrawToolChange={setActiveDrawTool} />}
                                    boundaries={drawnBoundary ? [drawnBoundary] : []}
                                    onBoundaryAdd={(b) => {
                                        setDrawnBoundary(b);
                                        setActiveDrawTool(null);
                                    }}
                                    activeDrawTool={activeDrawTool}
                                    onDrawToolChange={setActiveDrawTool}
                                    pointLabels
                                    className="h-72"
                                />
                            </TabPanel>

                            <TabPanel id="list" className="flex flex-col gap-4">
                                <Select.ComboBox
                                    label="Select a location"
                                    placeholder="Search and select from the list"
                                    hint={selectedPark && !selectedPark.center ? "This place has no position on the map yet. Draw it on the map instead." : undefined}
                                    items={locations.map((place) => ({ id: place.id, label: place.name }))}
                                    selectedKey={selectedParkId}
                                    onSelectionChange={(key) => setSelectedParkId(key as string | null)}
                                >
                                    {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
                                </Select.ComboBox>
                            </TabPanel>

                            <TabPanel id="coordinates" className="flex flex-col gap-4">
                                <Input label="Specify a Location Name" isRequired value={name} onChange={setName} />
                                <CoordinateFields
                                    lat={lat}
                                    lon={lon}
                                    onChange={(la, lo) => {
                                        setLat(la);
                                        setLon(lo);
                                    }}
                                />
                            </TabPanel>
                        </Tabs>

                    </div>
                    <ModalFooter>
                        <Button iconLeading={XClose} color="secondary" size="md" slot="close">
                            Cancel
                        </Button>
                        <Button iconLeading={Plus} color="primary" size="md" isDisabled={!canAdd} onPress={handleAdd}>
                            Add location
                        </Button>
                    </ModalFooter>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function coordinatesBoundary(lat: number | null, lon: number | null): Boundary | null {
    if (lat == null || lon == null) return null;
    return { id: "coords", kind: "circle", center: [lat, lon], radiusKm: POINT_RADIUS_KM };
}
