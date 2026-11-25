"use client";

import type { FC } from "react";
import { Dialog, DialogTrigger } from "react-aria-components";
import { Circle, MarkerPin02, Pentagon, Target04, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Popover } from "@/components/base/select/popover";
import { DRAW_TOOLS, boundaryName, boundarySummary, formatCoordinates, formatRadius, isPointBoundary, polygonCentre, type Boundary, type DrawTool } from "./geo";

// The drawing tools, as one group of buttons: Draw polygon, Draw circle, Mark a point. The extent picker (a project's geographic extent, a record's location, a restriction's area) and the DLA "Add a location"
// map had a copy each, so a new tool had to be added twice and the two could drift; Explore offers the same tools from its "Add area" menu and takes its words and icons from here. The words are `DRAW_TOOLS`
// (geo.ts), the icons are below (one icon per concept, 2.4: MarkerPin02 is a point, as Explore's area chips already draw one).

export const DRAW_TOOL_ICON: Record<DrawTool, FC<{ className?: string }>> = {
    polygon: Pentagon,
    circle: Circle,
    point: MarkerPin02,
};

const ORDER: DrawTool[] = ["polygon", "circle", "point"];

/** The tools as toggle buttons: pressing the lit one turns the tool off, pressing another changes tool. They wrap where the column is narrow, and the pressed one reads "Drawing…" (or "Marking…"). */
export function DrawToolButtons({ activeDrawTool, onDrawToolChange, className }: { activeDrawTool: DrawTool | null; onDrawToolChange: (tool: DrawTool | null) => void; className?: string }) {
    return (
        <div role="group" aria-label="Drawing tools" className={className ?? "flex flex-wrap gap-2"}>
            {ORDER.map((tool) => {
                const on = activeDrawTool === tool;
                return (
                    <Button
                        key={tool}
                        color={on ? "primary" : "secondary"}
                        size="sm"
                        iconLeading={DRAW_TOOL_ICON[tool]}
                        aria-pressed={on}
                        className="flex-1 whitespace-nowrap"
                        onPress={() => onDrawToolChange(on ? null : tool)}
                    >
                        {on ? DRAW_TOOLS[tool].busy : DRAW_TOOLS[tool].button}
                    </Button>
                );
            })}
        </div>
    );
}

/** What was drawn, as the two lines a result row shows: what happened (the tool's own words, finished) and, under it, the detail. The place of a point is the detail that matters, so it is written out to the metre. */
export function describeDrawn(boundary: Boundary): { tool: DrawTool; title: string; detail: string } {
    if (boundary.kind === "polygon") return { tool: "polygon", title: "Polygon drawn", detail: `${boundary.points.length} points (centre ${formatCoordinates(polygonCentre(boundary.points))})` };
    if (isPointBoundary(boundary)) return { tool: "point", title: "Point marked", detail: `At ${formatCoordinates(boundary.center)}` };
    return { tool: "circle", title: "Circle drawn", detail: `${formatRadius(boundary.radiusKm)} radius at ${formatCoordinates(boundary.center)}` };
}

/** Every corner of a polygon, in the order it was drawn, to the metre: what the row's "centre" cannot say. A button that opens a list, since a polygon can have dozens of corners and the row has one line for them. */
function PolygonCoordinates({ points }: { points: [number, number][] }) {
    return (
        <DialogTrigger>
            <Button color="tertiary" size="sm" iconLeading={Target04} className="shrink-0">
                Coordinates
            </Button>
            <Popover size="auto" placement="bottom end" className="w-[320px] max-w-[calc(100vw-2rem)] p-0">
                <Dialog aria-label="Polygon coordinates" className="flex flex-col outline-hidden">
                    <p className="m-0 border-b border-secondary px-4 py-3 text-sm font-semibold text-primary">{points.length} points, in the order drawn</p>
                    <ol className="m-0 max-h-72 list-none overflow-y-auto p-0">
                        {points.map(([lat, lon], i) => (
                            <li key={i} className="flex items-baseline gap-3 px-4 py-1.5 text-sm text-primary tabular-nums first:pt-3 last:pb-3">
                                <span className="w-5 shrink-0 text-right text-xs text-tertiary">{i + 1}</span>
                                {formatCoordinates([lat, lon])}
                            </li>
                        ))}
                    </ol>
                </Dialog>
            </Popover>
        </DialogTrigger>
    );
}

/** The one line under the drawing tools that says where things stand, in a fixed height so the map below never moves: what to do while a tool is on, the shape that is there once one is drawn, and what to do when there is none.
 *  The drawn shape is a row built like the bar Explore puts on the map while a shape is drawn (the tool's icon in a tile, the state in 14/600, the detail under it in 12/400), with the tool's icon in success colours: it is the
 *  answer, so it is the heaviest thing in the block, and the same icon as the button that made it ties the two together. Drawing again replaces it. */
export function DrawStatusLine({ boundary, activeDrawTool, onRemove }: { boundary: Boundary | null | undefined; activeDrawTool: DrawTool | null; onRemove: () => void }) {
    const drawn = boundary ? describeDrawn(boundary) : null;
    const Icon = drawn ? DRAW_TOOL_ICON[drawn.tool] : null;
    return (
        <div role="status" className="flex min-h-[3.375rem] items-center">
            {activeDrawTool ? (
                <p className="m-0 text-sm text-balance text-tertiary">{DRAW_TOOLS[activeDrawTool].hint}</p>
            ) : drawn && Icon ? (
                <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-secondary bg-primary p-2">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-secondary text-fg-success-primary">
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-primary">{drawn.title}</p>
                        <p className="m-0 truncate text-xs text-tertiary tabular-nums">{drawn.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {boundary?.kind === "polygon" && <PolygonCoordinates points={boundary.points} />}
                        <Button color="tertiary" size="sm" iconLeading={Trash01} className="shrink-0" onPress={onRemove}>
                            Remove
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="m-0 text-sm text-balance text-tertiary">Draw a polygon or circle, or mark a point, on the map to define this area.</p>
            )}
        </div>
    );
}

/** What a drawn shape is, in a line, as the chips and the rows name it (`boundaryName`): its kind, its size and where it is. A named place (a park or a listed location) says where by its name. */
export function drawnShapeLine(boundary: Boundary): string {
    return boundary.label ? boundarySummary(boundary) : boundaryName(boundary);
}
