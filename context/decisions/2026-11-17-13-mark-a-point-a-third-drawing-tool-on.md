# 2026-11-17 - Mark a point: a third drawing tool on every map you draw on

- **Nov 17 2026: Mark a point: a third drawing tool on every map you draw on.** The designer asked for a third way to draw on every map that offers a circle and a polygon: mark a point, designed to be intuitive, understandable and informative.

**The job.** A person defining a place (a search area in Explore, a project's geographic extent or a record's location, a licensed location in the DLA form) wants to say "here" with one click.

**Principles it was built from.** Make it obvious (5): what a click will commit is shown before the click. Tell the truth (4): the readout is the position to the metre, from the map, never a label. One system (3): one definition of the three tools, one set of buttons, Explore's menu takes its words and icons from the same place. Say less (1): the readout shows only the position (the instruction is in the bar or the line each screen already has), and `leaflet-draw`'s own cursor tooltip stays off. Reach everyone (8): Escape, and Tab, arrows and Enter from the keyboard.

**What a point is.** A circle with a radius and a pin, as an entered coordinate always was (Explore's chips already call it a point). No new `Boundary` kind, so every screen that reads a boundary (search, fitting, the project page, the nomination areas) handles it with no change. `isPointBoundary` (id starts `point-` or `coord-`) tells it apart; `boundarySummary` and `drawnShapeLine` read it as "Point at -35.91997, 139.22836 (25 km radius)".

**What it does.**
- Before the click, a pin, a dashed ring of the radius the place will cover, and the position to 5 decimal places follow the pointer (`PointTool`, `sa-map.tsx`). The pin's tip is on the cursor.
- A click places it and the tool ends, as the other two do. The placed pin says where it is when pointed at.
- Each screen says what to do while the tool is on, in the same words (`DRAW_TOOLS`, `geo.ts`): Explore's bar (with a Radius field, because the radius is the one thing chosen before the click), the extent picker's status line, a line in the DLA map tab (always one line high, so the map does not move). Once placed, they say what was marked.
- Keyboard: Tab to the map, the ghost appears at the centre, arrows move the map under it, Enter or Space places it, Escape cancels.
- Escape now cancels any tool on any screen (`DrawBridge`): `leaflet-draw` stopped its handler but the screens' "Drawing..." buttons stayed lit (1.9 item 1). Explore had its own listener; the other two did not.

**Where it is.** `DrawToolButtons` (`app/pages/_shared/map-search/draw-tool-buttons.tsx`) replaces the copy in the extent picker and the copy in the DLA modal. Explore keeps its "Add area" menu (Draw a circle, Draw a polygon, Mark a point, then the forms). The extent picker's callers (Add Project, the project page's extent, a record's location, restrictions, nominations) all take it. The radius a screen's points have: Explore the one shared radius (25 km, 5 to 300), the extent picker its own (25 km for registration, small for a record), DLA 1 km.

**Icons (2.4, 3.12).** A point is `MarkerPin02`, as Explore's area chips already drew it. "Enter coordinates" in Explore was also `MarkerPin02`, which would have put one icon on two actions in one menu; it is now `Target04`, the Coordinates tab's icon in the extent picker and the DLA map.

**Also fixed.** Explore named a second area "Circle 3" or "Point 3" in development: the name was taken inside a state updater, which React calls twice. It is taken before.

**Behaviour in its home (0.6 item 9, 1.10).** The point tool is an extension of the existing draw bridge in `sa-map.tsx` (extend, do not fork, 1.6), not a new component; `DrawToolButtons` is a shared piece next to it, not in `components/**`. Both sit in `app/pages/_shared`, where `SAMap` already was. Whether the map and its tools move into `components/**` is the open item 1.10 already carries for the map behaviours, for the designer.

**Verified (live, Explore, the DLA Add a location modal, Add Project's Geographic extent).** tsc, eslint on every touched file, `npm run check:contracts` pass. In a browser: the menu lists the three tools; the preview follows the pointer with its tip on the cursor; a click makes a "Point 1" chip with the point icon, ends the tool and removes the preview; the readout is Barlow, 12px, 500, tabular, white with the map-surface edge; Escape cancels; the keyboard places a point at the centre; the DLA modal's map does not move between hint and done (its top is 401px in both) and does not close; the extent picker shows "Point at ... (25 km radius)" with Remove and no horizontal scrollers.

**Not measured, and open (0.5, 0.4).**
- Narrow widths: the preview window did not resize, so the three buttons were measured at the modal's and the form's normal widths only. They wrap (`flex-wrap`, `flex-1`) where there is not room; not seen.
- Touch: a tap places the point at once, with no hover to preview. A finger covers what it taps, and there is no way to nudge a placed point (remove and mark again). A "pan the map under a centre pin, then press Place" mode and a draggable pin are the usual answers; neither is built. For the designer.
- The point's radius is chosen in the bar in Explore and in the Coordinates tab on the extent picker and DLA; whether those two should also get the field in their status line is open.
- The Prototype tools' bar overlaps Explore's bottom bar on a 1280 by 800 window in the preview (the tools bar is Scaffold and draggable, 3.8); not changed.
- Not committed.

## Same day, continuation: the selected point was not obvious

The designer, with a screenshot of a record's location (a 100 m point): "the selected location is not visible obvious. Make it obviously seen. Would it be helpful to display on map?" Two causes. The result was one 14px line of text above the tool buttons, the quietest thing in the block and a long way from the map. And on the map a 100 m radius is a speck when the field fits the whole allowed area, so the only mark was a stock pin.

**Principles:** make it obvious (5), one thing first (2), one system (3). The answer, a place, is now the heaviest thing in its block, and it is on the map as well as in words.

**Changes.**
- `DrawStatusLine` (`draw-tool-buttons.tsx`), shared by the extent picker and the DLA map, replaces the picker's `DrawStatus` and the DLA's plain line plus its "Clear shape" link (one control per action, 3.12: Remove is in the row). A drawn shape is a row built like Explore's on-map bar: the tool's own icon in a success-tinted tile (the same icon as the button that made it), the state in 14/600 ("Point marked", "Polygon drawn", "Circle drawn"), the detail under it in 12/400 tabular ("At -35.96448, 139.36569 (25 km radius)"). Its height is the same in every state (idle, drawing, drawn: 54px), so the map does not move. The type is the on-map bar's (`DrawStatusBar`), and the tile's corner is its 8px under a 16px card.
- On the map, a placed point gets a 40px brand-coloured ring centred on it at any zoom (`POINT_HALO_ICON`, `.map-point-halo`), which lands once (300ms, ease-out, none with reduced motion), and, where a screen holds one selected place (`pointLabels`: the extent picker, the record location, the DLA map), its position written beside the pin all the time. Explore holds many areas and keeps hover-only labels.

**Not done, offered.** A "Show on map" control to fly to the point; the map already fits the point and the allowed area together on purpose, so a point deep inside a large area stays small, with the ring and label to find it.

**Verified live.** Record location (Quadrat, project page): "Point marked, At -35.03098, 138.71909 (100 m radius)", the halo is 40px after its animation and centred on the pin's tip (993, 640 both), the label is shown, 54px row. Add Project's extent: the card, the pin, the ring and the label in a screenshot. DLA: row, ring, label, no "Clear shape" link, the map's top is 443px idle and drawn. Not seen in a screenshot: the record location (the page is too heavy for the preview's snapshot; measured from the DOM), and narrow widths (the preview would not resize). A point inside the record location's allowed site is the only kind it takes, and the point's 100 m radius must fit inside too, so a point near the site's edge is refused with the existing warning; noted, not changed.

## Same day, second continuation: a marked point has no radius, and the areas say what they are

The designer, with a screenshot of Explore's area chips ("POINT 2", "CIRCLE 6"): "point marked must only be 0m radius. Provide context as what is selected."

**A marked point is radius 0, on every screen.** It is a place and nothing more. This replaces the first entry's radius for a marked point (the radius field in Explore's bar, the dashed preview ring, `pointRadiusKm` on `SAMap`, the extent picker and the DLA map): all removed. The point is still stored as a circle, with `radiusKm: 0`, and `isPointBoundary` tells it apart. What the map draws for it is its pin, the 40px ring and its position; no circle (a circle of radius 0 has no area to draw). A coordinate entered in Explore's form is also a point and keeps its radius, because that form asks for one (not asked to change). Fitting the map to a point shows about 2 km across (`POINT_VIEW_M`), a view margin only, so the map does not zoom to rooftop level; the radius stays 0. Pointing at a point's entry in the areas list, or at its pin, draws a heavier ring (`.map-point-halo.is-on`), the point's equivalent of a shape's thicker outline.

**What is selected is written, not numbered.** Explore's area chips take `boundaryName` (`geo.ts`): "Point at -35.07609, 138.77046", "Point at -35.07609, 138.77046 (25 km radius)" for an entered coordinate, "Circle, 12 km radius at -35.07609, 138.77046", "Polygon, 5 points". The drawing screens' result row uses the same words ("Point marked", "At -35.07609, 138.77046"). The numbering (`nextLayerName`, "Circle 6") is gone; areas saved in an earlier search keep the name they were given.

**Consequence, for the designer (0.4, 0.7).** In Explore a search area of radius 0 matches only records at exactly that coordinate, so a marked point finds nothing in practice. Explore searched by what lies within an area. A point is a place, not an area, so the choices are: (a) leave it (a point is only a marker and the search is for areas), (b) a point searches for the nearest records or those within a distance the person chooses, shown in the card as it is, or (c) the point is not offered in Explore, only on the screens that define a place (extent, location, DLA). Not decided here. The empty state under a point alone still says "Try a larger area", which cannot be done for a point.

**Resolved by it:** a marked point on a record's location no longer has to fit its 100 m radius inside the allowed site (the old guard refused a point near the site's edge); only the point itself is checked.

**Verified.** tsc, eslint on the touched files and `check:contracts` pass. In a browser: Explore's bar has no radius field ("Click the map to place it."); a placed point's chip reads "Point at -29.68925, 139.04846", no circle is drawn for it, and pointing at its chip draws the 52px, 4px ring; the DLA modal's row reads "Point marked, At -30.01203, 135.79102" with the ring and the label, no circle, and the map does not move (top 443px before and after). Not seen: a circle's chip (the synthetic drag did not start leaflet-draw's circle tool; the name is a plain function of the boundary), the Add Project and record screens after this change (they use the same components), and any of it in a screenshot (the preview's frames were throttled, so these are measured from the page's DOM).

## Same day, third continuation: a polygon says where it is

The designer: "polygon not providing coordinates?" A marked point said where it was, and a polygon said only "Polygon, 5 points" (the older review summary, `boundarySummary`, lists every vertex, so this was a gap in the new chips and rows, 4 Tell the truth, 5 Make it obvious).

- `boundaryName` (chips, and the project page's Extent through `drawnShapeLine`) now says a polygon's centre: "Polygon, 5 points (centre -35.07609, 138.77046)"; `polygonCentre` is the average of its corners. A circle's row says where its centre is, as its chip does ("Circle drawn, 2 km radius at ...").
- The drawing screens' result row for a polygon has a **Coordinates** button (tertiary, `Target04`, the coordinates icon of the Coordinates tabs) that opens a popover (the design system's `Popover`, as the report toolbar's Parameters) of every corner, numbered in the order drawn, to the metre, at most 72 high and scrolling for a polygon with many corners. Escape closes the popover and nothing else.
- Verified in the DLA modal: a four-corner polygon drawn with real clicks reads "Polygon drawn, 4 points (centre -29.24438, 135.79102)", the button lists the four corners (Barlow 14px, tabular), the map's top stays 443px, Escape leaves the modal and the polygon. Not seen: the Explore chip for a polygon (the same function), and a screenshot (frames throttled in the preview).
- Not built: corner markers or labels on the map for a polygon; a point has a permanent label, a polygon has its list. For the designer if wanted.
