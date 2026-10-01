# AGENTS.md

Weighted is a single-user grade and GPA tracker built with TanStack Start and deployed on Netlify. See README.md for features and grading rules.

## Architecture

- **All grade math is client-side and pure**, in `src/lib/grades.ts`: types, the 80/20 class grade, GPA points, weighting, per-assignment impact, and `neededScore` (solves for the next quiz or test score). Change the grading rules here and nowhere else.
- **Persistence**: the whole gradebook is one JSON document (the `Tracker` type) stored in the `trackers` table (`db/schema.ts`, jsonb `data`), keyed by a random tracker ID.
  - `src/server/tracker.functions.ts` provides the `loadTracker` and `saveTracker` server functions, which validate the ID format and document shape.
  - `src/lib/store.tsx` (`TrackerProvider` / `useTracker`) keeps the ID in localStorage (`gradebook:id`) and a cache (`gradebook:cache`). It debounce-saves every `update()` and accepts `?sync=<id>` links. There are no user accounts; the ID works as a bearer secret.
- **Import**: `src/lib/importSheet.ts` unzips `.xlsx` files with fflate and reads the sheet XML with DOMParser in the browser. It matches columns by **header text**, not position: a summary tab (`Class`, `Current Grade`, `AP?`, `Target Grade`, plus a `Previous Class` table) and class tabs (`Test/Quiz`, `Name`, `Score`). Class tabs are matched to summary rows by normalized name. Summary rows without a tab keep their grade as `manualGrade`.
- **What-if grades** are ordinary assignments with `simulated: true`. They count only when the global `simulate` flag (the header toggle) is on, through `counted()`.

## Directories

- `src/routes/`: `index` (dashboard), `class.$courseId`, `calculator` (accepts a `?class=` search param), `history`, `import`, and `__root` (fonts, provider, `AppShell`).
- `src/components/`: `AppShell` (navigation, what-if toggle, sync menu), `ui.tsx` (tone colors, badges, `NumberField`), `GradeChart`, `NeededVerdict`, `AddCourse`.
- `src/lib/sample.ts`: invented sample gradebook for the empty-state "Explore" button.
- `db/`, `drizzle.config.ts`, `netlify/database/migrations/`: Netlify Database with Drizzle. Use `drizzle-orm@beta`. Never hand-edit applied migrations.

## Conventions

- Design tokens are in `src/styles.css` (`@theme`): paper, ink, pen (red), sage, slate, ochre, and sim (purple for what-if). Fonts are Fraunces (display), Instrument Sans (body), and JetBrains Mono (`.num` for figures).
- Shared classes: `.card`, `.input`, `.btn` with `.btn-ink`, `.btn-ghost`, or `.btn-pen`, and `.label`.
- Route files export only `Route`. Put shared components in `src/components/`.
- Chart.js renders only after mount to avoid SSR problems.
