# Eventora AI

An event planning assistant for weddings, birthdays and community events, built with React, TypeScript and TanStack Start.

## Features

- Template starter plans with budgets in integer paise, dated tasks, vendor checklists and personalized idea cards.
- Editable expenses, allocations, task completion, vendor status and saved ideas.
- Optional private Supabase accounts with explicit saves and revision conflict protection.
- Server-side Gemini proposals with schema validation, review before application and recoverable history.
- Budget and guest-count changes with a before/after preview, exact allocation, persistent category locks and preservation of recorded work.
- Clear template/AI attribution and estimate labels.

## Development

Requires Node.js 22.16+ (22 LTS recommended).

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

`npm run check` requires zero-warning ESLint, strict TypeScript (including unused locals and parameters), coverage-gated tests and a production build. The automated suite contains 185 tests across 27 files using synthetic fixtures, including actual Postgres migration tests through PGlite. A comprehensive assistive-technology audit remains a separate release check.

The frontend supports public Supabase configuration through the checked-in development defaults or `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` overrides. Set `VITE_DEMO_ONLY=true` to disable accounts.

## Code organization

- `src/routes`: route metadata and parameter wiring; page UI lives in `src/components/pages`.
- `src/components/create-event`: focused wizard steps with shared typed validation in `src/lib/event-form.ts`.
- `src/components/workspace`: focused Overview, Budget, Tasks, Vendors and Ideas tabs, plus expense entry.
- `src/state/*-context.ts`: typed context contracts and consumer hooks; provider components remain in separate TSX modules.
- `src/lib`: money/date rules, schema validation, templates and deterministic replanning.
- `src/lib/cloud`: authenticated persistence and revision-aware saves.
- `src/lib/ai`: provider adapter, validated proposal domain, request service and client.
- `supabase/migrations`: versioned database constraints, policies and atomic operations.

UI components call the state/repository contracts; provider credentials and model calls stay behind the authenticated Edge Function. Tests use synthetic fixtures and mocked provider responses; CI does not require a Gemini key.

## Verification scope

`npm run test:coverage` measures `src/lib` and `src/state` (excluding test files and public project constants); it does not claim whole-application or end-to-end coverage. Current measured coverage: 89.65% statements, 81.32% branches, 93.47% functions and 92.77% lines. CI enforces minimums of 88%, 80%, 90% and 90%, respectively.

Automated axe checks cover the five workspace tabs and wizard/error states. Because jsdom cannot measure visual layout, those checks exclude rendered color contrast; 28 separate numerical checks cover declared light/dark text pairs, input boundaries and focus indicators. These checks complement browser QA and do not certify full WCAG compliance.

Dependency verification uses `npm audit --audit-level=moderate` in CI. The audited lockfile currently reports no known vulnerabilities, including development dependencies. The minimatch override selects the patched release for the lint toolchain; it is exercised by the zero-warning lint gate. There is no live provider call in CI.

## Server setup

Apply the versioned SQL migrations under `supabase/migrations` in order. Deploy `supabase/functions/planner` with its referenced TypeScript modules and `deno.json`. Keep JWT verification enabled.

Set `GEMINI_API_KEY` only in Supabase Edge Function Secrets. The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` optionally overrides it. The default origin allowlist includes `https://eventora-ai-phi.vercel.app` and local development origins. `APP_ORIGINS` replaces the defaults for another deployment. Never place provider or service-role keys in browser code, Git, chat or `VITE_*` variables.

The provider adapter bounds generation attempts, validates all output locally, and supports a JSON-mode compatibility retry after constrained-schema rejection. Template data is never presented as a successful provider response.

## Replanning

Open an event → Budget → Adjust budget and guest count. Enter new values, choose category locks and preview. Applying changes preserves expenses, tasks, vendors and saved ideas. Account users explicitly Save to account, then request fresh AI suggestions if desired. Guest counts do not automatically scale vendor quotes.

See [replanning behavior and tests](docs/REPLANNING.md) for allocation rules, stale-preview protection and optional lock metadata.

## Repository workflow

This repository contains the consolidated Eventora AI application on main, including the final hardening and verification pass. It was migrated from the development snapshot 7efe66eb0f6040d552ee5380c7ae692c3d6f1a06. The original repository and its phase PRs remain unchanged. This repository has fresh history and is not automatically connected to the old Lovable project.

Use npm and package-lock.json for dependency installation. The UI, templates, account storage, Gemini integration, migrations, tests and CI workflow are included.

## Submission readiness

See [rubric mapping and release checklist](docs/SUBMISSION.md). The final pass removes unused starter components and dependencies, upgrades vulnerable packages, separates page UI from route metadata, adds coverage thresholds and accessibility checks, and hardens request-body limits and hosting headers. Verify each deployment on its final origin; comprehensive accessibility testing remains a release gate.
