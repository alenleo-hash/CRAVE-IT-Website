# CRAVE IT — Implementation and Design Plan

## Product and implementation

CRAVE IT is a responsive AI-assisted food discovery app that helps people choose a dish or cook from ingredients they already have. The initialized project is the Manus `web-db-user` template: React 19, TypeScript, Vite, Wouter, Tailwind, Express, tRPC, Drizzle ORM, and managed MySQL. The application will use those installed dependencies rather than introducing another framework.

The server exposes validated food-recommendation, contextual chat and ingredient-recipe endpoints. A curated, version-controlled catalog grounds dish and recipe metadata. A deterministic parser and ranking engine apply dietary choice, declared allergy and excluded-ingredient rules before scoring; budget is also enforced, and a narrowly relaxed price alternative can only be shown with an explicit disclosure. The Discover on-hand filter requires at least one real ingredient overlap, while recipe suggestions distinguish ingredients on hand from ingredients still needed. The engine preserves the requested baseline weights: craving 30%, cuisine/taste 20%, dietary/ingredient compatibility 20%, budget 15%, time/convenience 10%, and explicit preferences/feedback 5%. The service layer uses server-only `MANUS_API_URL` and `MANUS_API_KEY` when present for structured preference extraction and a second, grounded chat step; it may select only candidates that passed server-side filtering. The application renders IDs, facts, estimated prices/times, sources and limitations from validated records. If a provider, credentials or output fail, the labelled rule-based fallback remains usable.

Guests can use recommendations without registration. Guest preferences, conversations, feedback and saved items will persist in browser storage. The starter's actual Manus OAuth and session context will be used for the optional sign-in path; signed-in favorites and preferences will be stored per authenticated user in additive Drizzle tables and never looked up by a client-supplied user ID. Restaurant discovery will clearly explain that live business search is unavailable until a real places provider is configured. No fake businesses, live prices, reviews, opening hours, or verified nutrition claims will be shown.

The cooking assistant uses entered ingredients against curated recipe data, enforces saved allergy/diet/ingredient exclusions and budget, reports on-hand and missing items, scales quantities, and shows estimated prep/cook times and difficulty. “Find Alternatives” excludes the open recipe; “Make It Spicier” adjusts recipe-specific amounts and steps subject to exclusions; “Make It Budget-Friendly” ranks fewer missing ingredients, without claiming unknown prices or savings. Recipe retrieval is grounded in the curated catalog. Nutrition remains uncalculated until a reliable basis exists; allergy information is cautious and carries a cross-contact warning. No medical outcome is claimed.

### Project structure

- `client/src/App.tsx`: route table and application shell.
- `client/src/components/`: responsive navigation, search, dish/recipe cards, dialogs and reusable controls.
- `client/src/pages/`: Home, Discover, Chat, Recipes, Restaurants, Favourites, Taste Profile, About, Privacy, Sign In/Sign Up and Not Found.
- `client/src/contexts/FoodContext.tsx`: shared API calls and guest/account preference, favourites, feedback and recipe state; `client/src/lib/trpc.ts`: authenticated data transport.
- `client/src/index.css`: brand palette, responsive layout and interaction states.
- `shared/food.ts`: shared typed dish/recipe/preference models, curated records and dish-specific generated photo URLs.
- `server/food/constraints.ts`: natural-language and structured preference extraction, exclusions and typed validation.
- `server/food/ranking.ts`: hard filtering followed by configurable weighted ranking and explicit feedback signals.
- `server/food/agent.ts` and `server/prompts/food-agent.md`: server-only built-in LLM integration and versioned agent rules with a transparent fallback.
- `server/food/routes.ts`: input validation, request limits/timeouts and `/api` endpoints for recommendation, chat and recipes.
- `server/food/recipes.ts`: pure, curated recipe matching and tested alternatives, serving scaling, spicy and pantry-ranked budget transformations.
- `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, and additive migrations: authenticated saved-item/profile persistence scoped to the real signed-in user.
- `public/manus-routes.json`: complete static page route manifest.
- `README.md`, `.env.example`, and `TODO.md`: setup, integrations, limitations, and requirements.

## Design system

- **Design movement:** contemporary editorial food journal with restrained neo-brutalist framing and tactile restaurant-menu cues.
- **Core principles:** appetite-first photography; strong typographic hierarchy; useful, calm controls; honest provenance and estimates.
- **Color philosophy:** near-black and graphite create a late-evening dining room; warm ivory preserves softness and legibility; tangerine evokes roasted spice and is reserved for meaningful actions; sage signals vegetables and dietary compatibility.
- **Layout paradigm:** an editorial, offset two-column hero, followed by asymmetric featured-dish storytelling and horizontal category shelves; discovery uses a compact filter rail and responsive result list rather than a uniform dashboard grid.
- **Signature elements:** a small ember/sunburst brand mark; thin spice-orange divider and outline details; photo crops with a quiet caption/source line.
- **Interaction philosophy:** direct manipulation and immediate feedback; filters change actual data, saves toggle their state, per-card “Try another” preserves constraints while excluding that dish, and preference controls explain what changes. No decorative controls.
- **Animation:** short 160–240ms ease-out transitions for navigation, hover and state changes; a gentle image reveal only on first view; restrained skeleton shimmer; honor `prefers-reduced-motion`.
- **Typography system:** Cormorant Garamond for editorial display headlines, paired with DM Sans for body and interface; large display title, compact all-caps eyebrow labels, readable 15–17px body text.
- **Brand essence:** a thoughtful food-finding companion for people who want a meal that fits their actual craving, constraints and pantry; **warm, discerning, grounded**.
- **Brand voice:** warm, specific and quietly confident. Examples: “Tell us what sounds good.” and “These fit your budget and your spice mood.”
- **Wordmark & logo:** custom CRAVE IT wordmark beside a compact four-ray ember/plate mark drawn as a simple scalable icon, not default logo typography.
- **Signature brand color:** ember orange `#D96C3F`.

## Material constraints

No third-party food provider, restaurant search, maps/places connector or OpenAI/Gemini vendor connector is enabled. The project does have the platform's built-in server-side AI and managed MySQL in its current runtime. If the AI endpoint is not actually usable at runtime, the application will show its rule-based mode and retain functionality. Real restaurant search remains disabled until a supported source and required credentials are supplied. Development and published app share the managed database; schema changes will be additive and no existing app data will be intentionally deleted. Authentication will be optional and use the starter's genuine OAuth, not a simulated user.
