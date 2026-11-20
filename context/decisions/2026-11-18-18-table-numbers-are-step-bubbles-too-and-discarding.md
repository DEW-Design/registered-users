# 2026-11-18 - Table numbers are step bubbles too, and discarding a new shape asks first

- **Nov 18 2026: Changed in the lab (`app/proto/map-drawing/number-bubble.tsx` new, `draw-map.tsx`, `ui.tsx`, `app/proto/expand-and-draw/areas-panel.tsx`). Nothing in the product.** The designer answered the three questions in `2026-11-18-17`:
  - **"Not added yet" stays** as the waiting shape's status (a status after its subject takes a comma, 2.3).
  - **The table's "#" column draws the same bubble as the map's tooltip.** One `NumberBubble` (the steps' `IconTopNumber`: 24px circle, hairline ring, 12px semibold) is used by the tooltip and by each row, so a point's number reads the same on both. It fits the 1.5rem column, so the grid did not change. The column heading "#" stays.
  - **Discarding the waiting shape asks first.** The bin on the "New polygon" card opens the design system's `DestructiveModal`: "Discard this new polygon?", "It has not been added yet, so it will be lost.", a red Discard (`Trash01`) over "Cancel & keep editing" (`ArrowLeft`), stacked (`footerLayout="column"`, the same prompt shape as the form's and the workspace's Cancel). Remove on a used area still does not ask (open: the designer has not asked for it to).
  - **Agent calls (reversible in the three files).** The wording of the prompt; the same buttons as the workspace's Cancel prompt, for one pattern (0.9).
  - **Verified (18 Nov 2026, Chromium headless, 1440 by 900):** zero console errors. Rows 1 to 4 each have a bubble 24 by 24, radius 9999px, 12px weight 600; the hovered row's tint shows behind it. The bin: the prompt opens and the card is still there (1); "Cancel & keep editing" keeps it (1); Discard removes it (0) and the empty state returns. `tsc`, `eslint app/proto` and `check:contracts` clean.
  - **Not checked.** The prompt on a phone; a screen reader on the bubble (the number is its text; the inputs carry "Latitude of point 3").
  - **Open.** Whether Remove on a used area should ask too.
  - **Touches:** contracts 0.9, 2.13, 3.12, 5.4; `2026-11-18-16`, `-17`.
