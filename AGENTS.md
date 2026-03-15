# AGENTS.md — bsi-grundschutz-plusplus-viewer

## Repo purpose and operating model
- Static client-side React/Vite app for browsing and evaluating the BSI Grundschutz++ Anwenderkatalog (OSCAL JSON).
- Runtime is browser-only CSR. No backend, no server sessions, no database.
- Single-catalog contract:
  - Source input: `Kataloge/Grundschutz++-catalog.json`
  - Runtime artifacts: `public/data/**`
  - Generated service worker: `public/sw.js`
- No runtime dataset selector and no runtime JSON upload flow.

## Toolchain and local setup
- Node.js `>=20.19.0` (`.nvmrc` is authoritative).
- npm `>=10`; use npm (not pnpm/yarn/bun).
- Required build-time legal env vars:
  - `VITE_OPERATOR_NAME`
  - `VITE_OPERATOR_ADDRESS_LINE1`
  - `VITE_OPERATOR_ADDRESS_LINE2`
  - `VITE_OPERATOR_EMAIL`

## Git workflow and branch protection
- Work on short-lived branches; do not work directly on `main`.
- Keep branch names in one of these forms:
  - `feat/<topic>`
  - `fix/<topic>`
  - `docs/<topic>`
  - `refactor/<topic>`
  - `chore/<topic>`
  - `test/<topic>`
- For catalog-sync-only work, prefer `chore/catalog-sync-<topic>`.
- For UI-only work, prefer `fix/ui-<topic>` or `feat/ui-<topic>`.
- Use PR-based integration into `main`.
- Do not use workflow/bot auto-merge for this repo; merge manually after QA review.
- Current `main` protection (via GitHub API) requires:
  - required status check `qa` (`strict: true`)
  - pull-request based updates
  - conversation resolution
- `enforce_admins` is currently disabled; treat bypass as emergency-only, not normal workflow.

## Codebase map and boundaries
- `src/components/**`: UI components and legal/content pages.
- `src/hooks/**`: App flow orchestration and state transitions.
- `src/lib/**`: shared domain/security logic (routing, validation, schema, export, safety helpers).
- `src/workers/searchWorker.ts`: worker-side search/filter/detail/graph runtime.
- `scripts/**`: build/data/security/release scripts.
- `Kataloge/**`: source catalog input.
- `public/data/**`, `public/sw.js`: generated artifacts (do not treat as hand-authored source).

## Hard architecture contracts
### Routing contract (hash-based)
- Keep hash routing. Do not switch to history routing.
- Supported routes:
  - `#/`
  - `#/search`
  - `#/group/:id`
  - `#/control/:id`
  - `#/about`
  - `#/about/license` (alias `#/about/source`)
  - `#/impressum`
  - `#/datenschutz`

### Worker protocol contract
- `SearchClient` and `searchWorker` must stay in sync for message types:
  - `init`
  - `search`
  - `get-control`
  - `get-neighborhood`
  - `cancel`
- If worker payloads or response shapes change, update and verify together:
  - `src/workers/searchWorker.ts`
  - `src/lib/searchClient.ts`
  - `src/lib/dataSchemas.ts`
  - `src/types.ts`
  - affected UI/hook consumers

### Data pipeline contract
- `scripts/build-catalog.mjs` + `src/lib/normalize-core.js` define canonical normalization behavior.
- `npm run build:data` regenerates:
  - `public/data/catalog-meta.json`
  - `public/data/catalog-index.json`
  - `public/data/details/*.json`
  - `public/data/build-info.json`
  - `public/sw.js` (from `scripts/sw.template.js`)
- Legacy outputs are intentionally removed during build (`public/data/datasets`, `catalog-registry.json`, `profile-links.json`).

## Where to implement changes
- UI layout/interaction/routing rendering: `src/components/**`, `src/App.tsx`, related hooks.
- Search behavior/filtering/ranking/detail chunk loading/graph logic: `src/workers/searchWorker.ts` and worker-facing schemas/types.
- Catalog transformation and artifact generation: `src/lib/normalize-core.js`, `scripts/build-catalog.mjs`.
- Legal/operator output and placeholder behavior: `src/legal/placeholders.ts`, `src/components/ImpressumPage.tsx`, `src/components/DatenschutzPage.tsx`, `scripts/check-legal-placeholders.mjs`.
- CI/deploy behavior: `.github/workflows/quality.yml`, `deploy-pages.yml`, `daily-bsi-sync.yml`.

## Generated artifacts policy
- Do not hand-edit generated files in `public/data/**` or `public/sw.js`.
- Regenerate via `npm run build:data` (or `npm run build`) when source data/normalization/service-worker template changes.
- `public/data/**` and `public/sw.js` are gitignored build outputs; avoid treating them as reviewable source-of-truth diffs.

## Commands in this repo
- Setup:
  - `npm install`
  - `cp .env.example .env.local`
- Development:
  - `npm run dev`
- Data and builds:
  - `npm run sync:bsi`
  - `npm run build:data`
  - `npm run build`
  - `npm run preview`
- Tests and QA:
  - `npm run test:unit`
  - `npm run test:unit:raw`
  - `npm run test:unit:coverage`
  - `npm run check:release-hygiene`
  - `npm run qa:lighthouse`
  - `npm run qa:a11y`
  - `npm run qa:browser`
  - `npm run qa`
- Dependency audit:
  - `npm run audit:prod`
  - `npm run audit:dev`

## Validation matrix
- UI/component/routing change:
  - `npm run test:unit`
  - `npm run build`
- Worker/schema/data-contract change:
  - `npm run build:data`
  - `npm run test:unit`
  - `npm run build`
  - `npm run check:release-hygiene`
- CI/deploy/security-script change:
  - `npm run build`
  - `npm run test:unit`
  - `npm run check:release-hygiene`
  - plus the targeted check (`audit:*`, `qa:*`, or workflow-specific path checks) as relevant
- Merge-ready/release-quality validation:
  - `npm run qa`

## Sensitive surfaces (extra caution)
- Data generation and normalization:
  - `scripts/build-catalog.mjs`
  - `src/lib/normalize-core.js`
- Worker boundary and schemas:
  - `src/workers/searchWorker.ts`
  - `src/lib/searchClient.ts`
  - `src/lib/dataSchemas.ts`
  - `src/types.ts`
- Security-critical logic:
  - `src/lib/csv.ts`
  - `src/lib/controlExport.ts`
  - `src/lib/urlSafety.ts`
  - `src/lib/routing.ts`
  - `src/lib/searchSafety.ts`
  - `src/lib/securityBudgets.ts`
  - `src/lib/validation.ts`
- Legal/operator surfaces:
  - `src/legal/placeholders.ts`
  - `src/components/ImpressumPage.tsx`
  - `src/components/DatenschutzPage.tsx`
  - `scripts/check-legal-placeholders.mjs`
- Deployment/automation:
  - `.github/workflows/quality.yml`
  - `.github/workflows/deploy-pages.yml`
  - `.github/workflows/daily-bsi-sync.yml`

## CI and hosting constraints
- `quality.yml` is the primary QA gate (audit, coverage/unit tests, release hygiene, browser QA split by jobs).
- `deploy-pages.yml` deploys only after successful `quality` on `main` (`workflow_run`) or manual dispatch.
- GitHub Pages build uses `VITE_BASE_PATH=/${repository-name}/`; keep asset/base-path handling compatible.
- GitHub Pages cannot enforce all security headers repo-locally; avoid assuming host header controls exist by default.

## Current repository limits (do not overclaim)
- TypeScript `strict` is `false`.
- No dedicated lint/format script pipeline in `package.json`.
- No Docker/devcontainer setup in this repo.
- No `CONTRIBUTING.md` or root `SECURITY.md` currently present.

## Definition of done for agent changes
- Requested behavior is implemented without violating static/single-catalog/worker contracts.
- Relevant validations were run (or explicitly skipped with reason).
- Report explicitly:
  - commands run
  - whether generated artifacts changed (especially `public/data/**` / `public/sw.js`)
  - whether GitHub Pages behavior is affected
  - skipped checks
  - residual risk
- Update docs when behavior/contracts/setup/validation expectations change (`README.md`, `AGENTS.md`, relevant `docs/*`).
