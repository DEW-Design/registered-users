# BioData SA - user testing edition

The registered user's flow of the BioData SA prototype, on its own, for testing with users. It is a **fully static site**: `npm run build` writes plain HTML to `out/`, which any static host can serve.

It was cut from the prototype repo (`sai-wips`, commit `eac2785`, 17 Nov 2026) and is maintained separately from it. Nothing here calls a server: all data is sample data, and what a participant enters is kept in their own browser.

## What is in it

| Section | Route |
| --- | --- |
| Landing page (the original BioData home page) | `/pages/biodata-home` (`/` forwards to it) |
| Log in, sign up and the rest of the auth steps | `/pages/auth/*` |
| Home (My BioData, Flora and Fauna Dashboard) | `/pages/dashboard` |
| Projects: list, project page, Add Project, upload a dataset, flagged concepts | `/pages/project-list`, `/pages/project-list/<id>/project-details`, `/pages/project-list/<id>/upload`, `/pages/project-registration`, `/pages/flagged-concepts` |
| Explore, with Map only / Map and table | `/pages/observations` |
| Data licences (DLA) | `/pages/dla` |
| Sensitive nominations | `/pages/nominations` |
| Template Finder | `/pages/template-finder` |
| Reports | `/pages/reports` (only the reports a registered user may open) |

**Not in it:** the data ingestion stress test page, Data sharing agreements, User Management, Controlled Vocabulary, Taxonomy Management, Notification Management, Voucher Management, the design-system docs, the `/pages` screen index and every design lab. The reading code that the dataset upload shares with the stress test is kept (`app/pages/data-ingestion-stress-test/*-ingest.ts`), without its page.

## The four test tasks, and where each starts

1. **Create a project:** Home, Add, Project (or Projects, then Add project): `/pages/project-registration`.
2. **Upload a dataset:** a project's Upload (`/pages/project-list/<id>/upload`), or Home, Add, Dataset.
3. **Explore species:** Explore (`/pages/observations`), search a species or add an area.
4. **View templates and reports:** Template Finder (`/pages/template-finder`) and Reports (`/pages/reports`).

A participant starts at the landing page (`/`), chooses Log in (any email and password; there is no account check), and lands on Home.

## How it differs from the prototype

- **One fixed role, registered user** (`lib/use-user-role.ts`). The `?userRole=` address parameter is ignored, so changing the address cannot reach another role's screens.
- **No Prototype tools bar** (`app/_prototype-tools/prototype-tools.tsx` renders nothing), so there is no role switcher and no layout switcher.
- **"Pre-fill sample content" is off** (`app/_prototype-tools/sample-content.ts` is a no-op), so every form opens empty.
- **Internal links are plain paths** (`lib/use-role-href.ts`).
- **Not indexed:** `robots.txt` disallows everything and every page carries `noindex`.
- `/` forwards to the landing page. A static host has no server redirect, so this happens in the browser (`app/page.tsx`).
- **Two layouts chosen from the prototype's options:** the landing page is the original BioData home page (option 2 in the prototype), and Explore has the "Map only / Map and table" switch (option 2 in the prototype). There is no layout switcher: these are the only versions.

## Run it

Needs Node.js 20 or later.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # static site in out/
```

### Host it

Build, then publish the `out/` folder.

- **Its own host, at the root** (for example `https://testing.example.com`): `npm run build`.
- **Under a sub-path** (for example `https://example.com/testing/`): `BASE_PATH=/testing npm run build`.
- The build is Node 20, `npm ci`, `npm run build`, upload `out/`. No server, no environment variables beyond the optional `BASE_PATH`.
- URLs end in a slash (`/pages/dashboard/`), as every static host serves them.

### Participants' data

What a participant creates (a project, a request, a nomination) is stored in that browser's local storage, so it stays between visits and does not reach any other browser. To start a participant from a clean slate, clear the site's data (or use a private window). Storage keys are not versioned by build, so a new release on the same address keeps the previous participant's data in that browser; clear it between sessions.

## Checked when this was cut

- `npx tsc --noEmit`: clean.
- `npm run build`: 80 static routes, built both at the root and under `/testing`.
- Served under `/testing/` and walked in Chrome: landing, log in, signup, Home, Projects (list, a project, Add Project, upload), Explore, DLA, nominations, Template Finder, Reports. Zero console errors, no tools bar, `?userRole=biodata-admin` ignored, an admin-only report blocked by address, `dsa`, the stress test and `proto` return 404, and all 26 internal links found resolve to a built page.
- Explore returns the same results as the prototype for the same searches.
- `npm run lint` reports 27 errors in `components/base/input/*` and `lib/config-context.tsx`. They are the same 27 the prototype repo has (the React hooks rules); none were added here.

## Not checked

Add Project and the dataset upload were opened but not completed end to end in this edition (the code is the prototype's, completed there). Rehearse tasks 1 and 2 first. Also not checked: touch, a narrow window, keyboard-only use, other browsers, and the Individual data owner type.

## Open, for the designer

- **Scope of Projects** (to be confirmed): the default Add Project is the version without a dataset step. Add Project with a dataset step (`/pages/project-registration/option-2`) is in the build but not linked.
- The data in every screen is the prototype's sample data (placeholder people such as Olivia Wyatt, sample projects and records).
- The pages the participants see were last designed on the prototype; any change to them from now on is made here, not merged from the prototype, unless someone copies it across.
