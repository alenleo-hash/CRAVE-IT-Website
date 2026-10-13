# CRAVE IT — Your cravings. Understood.

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## CRAVE IT application

The frontend is a responsive food-discovery SPA. The Express `/api/food` routes implement a curated dish and recipe catalog, deterministic weighted recommendations, optional server-side Manus AI structured preference extraction and a second chat response that is constrained to server-filtered candidate IDs. Explicit cuisine, meal type, diet, budget, allergies and exclusions are parsed and applied; goals, time, difficulty and model-extracted flavours affect actual scores/filters. Allergy and dietary exclusions are enforced before scoring. The ingredients-on-hand discovery filter requires at least one catalog ingredient match. “Try another” regenerates the current request while preserving its filters and excluding the open dish; “Show similar” saves an explicit feedback event and ranks later dishes using its cuisine/tag affinity. Recipe output separates estimated preparation/cooking times, scales ingredient amounts, and distinguishes ingredients you listed from ingredients still needed. “Find Alternatives” excludes the recipe currently open, “Make It Spicier” applies a recipe-specific quantity/step adjustment unless prohibited by the user’s exclusions, and budget mode prioritizes fewer missing ingredients. There is no verified ingredient-price source, so the app does not claim that a change produces a known price saving. Recipe suggestions are curated retrieval—not model-generated recipes or an external recipe API. No third-party restaurant, map, menu-price or nutrition provider is connected, so the Restaurants page deliberately returns no fabricated listings and explains the limitation. Curated prices and preparation times are estimates, not live quotes.

### Run and verify

- `pnpm dev` starts the complete local/Preview app at the configured `PORT` (default 3000).
- `pnpm check` runs TypeScript diagnostics; `pnpm test` runs Vitest for dietary, allergy, budget, meal-time, explicit pantry filtering, persisted similarity ranking, recipe transformations, malformed/empty/unavailable AI behavior and server platform behavior.
- `pnpm db:migrate` applies checked-in, additive schema migrations. The taste profile, saved item IDs and explicit feedback use authenticated MySQL rows scoped to the server-validated user; guest data is stored locally in the browser.
- `pnpm build && pnpm start` runs the production build. The container reads the deployment-provided `PORT` at runtime.

Manus Cloud supplies the project database, OAuth and server-only platform AI variables. Do not set these to client-visible values. `.env.example` lists names only and contains no secrets. AI extraction uses `MANUS_API_URL` and `MANUS_API_KEY`; if they are absent or the service is unavailable, the app falls back to rule-based recommendations and labels that mode. The public `/api/food/config` response exposes only whether AI is available, never credentials.

For real place search, configure and implement a provider that returns verifiable business records; the current app does not connect to one. No map API key, restaurant feed, live menu prices, ratings/reviews, verified opening hours or nutrition source is enabled. A future provider may be declared using protected server-side secrets and its own documented data-handling terms.

Guest preferences, favourites, feedback and recent chat are browser-local. The optional account flow is genuine Manus OAuth; authenticated food data is accessed through protected server procedures, and Taste Profile includes a user-confirmed delete action and generates recommendations from saved quiz answers. Never enter sensitive medical information. Allergy tags do not guarantee that food is free of an allergen or cross-contact.

More product criteria and current work status are recorded in `TODO.md`; the implementation and visual direction are in `plan.md`.
