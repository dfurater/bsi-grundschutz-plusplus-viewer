# AGENTS.md — bsi-grundschutz-plusplus-viewer

## Project context
This repository is a static client-side React/Vite application for searching, navigating, and locally evaluating BSI Grundschutz++ OSCAL catalogs.

Key architecture facts:
- Frontend: React 19 + TypeScript + Vite
- App type: static CSR, no backend
- Routing: hash-based routing
- Search/index logic: Web Worker
- Source inputs: `Kataloge/*.json`
- Generated artifacts: `public/data/**` and `public/sw.js`
- Hosting targets: GitHub Pages and other static hosts
- CI/CD and automation exist in `.github/workflows/*`

## Environment and toolchain
- Required Node.js: `20.19.0` or newer
- Required npm: `10` or newer
- `.nvmrc` is authoritative for local Node version
- Use npm, not pnpm/yarn/bun

## Required workflow for any code change
1. Read the relevant docs first:
   - `README.md`
   - `docs/architecture.md`
   - `docs/setup-and-operations.md`
   - `docs/testing.md`
   - `docs/security-review.md`
2. Identify whether the change affects:
   - UI / routing
   - worker protocol
   - catalog normalization / build pipeline
   - generated data artifacts
   - legal pages / operator metadata
   - hosting / CI / deployment
3. State clearly whether `public/data/**` changes are expected.
4. Keep the change narrowly scoped.

## Git and branch policy
- Never commit directly to `main`.
- Use short-lived branches only.
- Branch naming:
  - `feat/<topic>`
  - `fix/<topic>`
  - `docs/<topic>`
  - `refactor/<topic>`
  - `chore/<topic>`
  - `test/<topic>`
- For catalog-sync-only changes, prefer:
  - `chore/catalog-sync-<topic>`
- For UI-only changes, prefer:
  - `fix/ui-<topic>` or `feat/ui-<topic>`

## Repository-specific implementation rules

### 1) Respect the static architecture
- Do not introduce a backend, server runtime, or server-only assumptions.
- Do not replace hash routing with history routing unless explicitly requested.
- Do not introduce features that require server-side sessions, authentication, or databases.
- Keep the app statically deployable.

### 2) Respect the data pipeline
- `Kataloge/*.json` are source inputs.
- `public/data/**` are generated artifacts, not hand-authored primary sources.
- If source schema or normalization logic changes, regenerate artifacts with:
  - `npm run build:data`
- Do not manually edit generated files unless the task explicitly requires a one-off repair and the reason is documented.
- Treat `scripts/build-catalog.mjs` and normalization logic as critical infrastructure.

### 3) Respect the worker boundary
- Search, filtering, chunk loading, graph computation, and upload ingestion are worker-sensitive areas.
- Be conservative when changing worker message contracts or data schemas.
- If worker-facing data shapes change, check for ripple effects in:
  - `src/workers/**`
  - `src/lib/dataSchemas*`
  - `src/types*`
  - UI components consuming worker responses
- Avoid casual protocol drift. Tiny mismatch, giant gremlin.

### 4) Respect security posture
- Preserve fail-closed validation behavior.
- Do not weaken schema validation, budgets, URL restrictions, CSV neutralization, or upload safeguards without explicit reason.
- Do not introduce unsafe external link handling.
- Do not bypass legal placeholder checks in production build flow.
- Treat service worker changes as security- and caching-sensitive.
- Treat `netlify.toml`, `public/_headers`, security scripts, and legal pages as controlled surfaces.

### 5) Respect legal/operator configuration
- Production builds depend on:
  - `VITE_OPERATOR_NAME`
  - `VITE_OPERATOR_ADDRESS_LINE1`
  - `VITE_OPERATOR_ADDRESS_LINE2`
  - `VITE_OPERATOR_EMAIL`
- Never hardcode real personal data into the repository unless explicitly instructed and appropriate.
- Preserve the build-time legal placeholder validation.
- If a task affects Impressum or Datenschutz, update both code and docs.

### 6) Respect hosting constraints
- GitHub Pages uses `VITE_BASE_PATH=/${repository-name}/`
- Do not break relative asset loading or base path handling.
- Remember that GitHub Pages does not enforce custom security headers like Netlify does.
- If hosting behavior changes, update:
  - workflow files
  - README deployment notes
  - relevant docs in `docs/`

### 7) Respect current repository limits
- TypeScript `strict` is currently `false`.
- There is no dedicated lint/format pipeline in `package.json`.
- Coverage thresholds are not configured.
- Do not pretend these are solved.
- If you improve them, do so explicitly, incrementally, and with documentation.

## Validation rules

### Minimum validation by change type
- UI / component / routing change:
  - `npm run test:unit`
  - `npm run build`
- Data pipeline / schema / worker change:
  - `npm run build:data`
  - `npm run test:unit`
  - `npm run build`
  - `npm run check:release-hygiene`
- CI / deploy / security change:
  - `npm run build`
  - `npm run test:unit`
  - `npm run check:release-hygiene`
  - run the specific related check if applicable
- Release-quality or merge-ready change:
  - `npm run qa`

### Available commands
- `npm run dev`
- `npm run sync:bsi`
- `npm run build:data`
- `npm run build`
- `npm run preview`
- `npm run test:unit`
- `npm run check:release-hygiene`
- `npm run audit:prod`
- `npm run audit:dev`
- `npm run qa:lighthouse`
- `npm run qa:a11y`
- `npm run qa`

### Validation reporting
For every task, report:
- which commands were run
- whether `public/data/**` changed
- whether the change affects GitHub Pages behavior
- whether any tests/checks were skipped
- residual risk

## Documentation update rules
Update documentation whenever you change:
- setup or required env vars
- build or data generation flow
- deployment behavior
- security assumptions
- worker/data contracts
- legal pages
- test strategy or QA expectations

Minimum doc targets to consider:
- `README.md`
- relevant file(s) in `docs/*`

## CI/CD awareness
This repository already has:
- a quality workflow for QA on push/PR/merge_group (Merge Queue kompatibel)
- a GitHub Pages deploy workflow
- a daily BSI sync workflow that may create PRs when catalog files change

## PR merge policy
- Do not use automatic PR merges via workflow, bot, or GitHub auto-merge.
- Always wait for QA checks to complete, then review QA results manually.
- Merge PRs only as a manual maintainer action after QA review is approved.

Do not break these workflows casually.
If you touch workflow files:
- explain why
- explain the impact on PR validation and deployment
- keep permissions minimal

## PR scope guidance
Prefer separate PRs for:
- UI/UX changes
- worker/data model changes
- CI/CD changes
- security hardening
- legal/content changes
- upstream catalog sync

Do not combine catalog-sync noise with unrelated code changes.

## Required output format for this repository
Always return:
1. Plan
2. Affected areas
3. Files changed
4. Whether generated artifacts changed
5. Commands run
6. Result
7. Risks / follow-ups
8. Suggested commit message
9. Suggested PR title
10. Suggested PR description
