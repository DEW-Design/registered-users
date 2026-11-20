# 2026-11-17 - Project name counter reads n/60 characters

- **Nov 17 2026: The project name's counter now reads "0/60 characters", not "0/60".** Correction of `2026-11-17-07` item 3: the designer's first note said "0/60 characters - move all the way to the right"; only the number was moved, and the designer pointed it out with a screenshot ("I said '0/60 characters'"). In `app/pages/project-registration/option-2/form-sections.tsx` the count is `{n}/{PROJECT_NAME_MAX} characters`, still at the field's right edge.
  - **Decided.** The wording and the place are the designer's.
  - **Verified (17 Nov 2026, live `/pages/project-registration/`, Chromium headless):** the counter reads "0/60 characters", then "32/60 characters" once a name is typed, at 320, 768 and 1440 wide; its right edge equals the field's right edge at all three (296, 744 and 1354px); zero console errors. `npx tsc --noEmit` and `npx eslint` on the file pass.
  - **Not checked.** The 320 wide look beyond those numbers (the hint line and the count share a row there). Not committed.
  - **Touches:** `2026-11-17-07`.
