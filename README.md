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

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` requires zero-warning ESLint, strict TypeScript (including unused locals and parameters), all tests and a production build. The automated suite contains 111 tests across 19 files using synthetic fixtures, including actual Postgres migration tests through PGlite. A comprehensive assistive-technology audit remains a separate release check.

The frontend supports public Supabase configuration through the checked-in development defaults or `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` overrides. Set `VITE_DEMO_ONLY=true` to disable accounts.

## Code organization

- `src/routes`: page composition, navigation and route metadata.
- `src/components/workspace`: focused Overview, Budget, Tasks, Vendors and Ideas tabs, plus expense entry.
- `src/state/*-context.ts`: typed context contracts and consumer hooks; provider components remain in separate TSX modules.
- `src/lib`: money/date rules, schema validation, templates and deterministic replanning.
- `src/lib/cloud`: authenticated persistence and revision-aware saves.
- `src/lib/ai`: provider adapter, validated proposal domain, request service and client.
- `supabase/migrations`: versioned database constraints, policies and atomic operations.

UI components call the state/repository contracts; provider credentials and model calls stay behind the authenticated Edge Function. Tests use synthetic fixtures and mocked provider responses; CI does not require a Gemini key.

## Server setup

Apply the versioned SQL migrations under `supabase/migrations` in order. Deploy `supabase/functions/planner` with its referenced TypeScript modules and `deno.json`. Keep JWT verification enabled.

Set `GEMINI_API_KEY` only in Supabase Edge Function Secrets. The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` optionally overrides it. The default origin allowlist includes `https://eventora-ai-phi.vercel.app` and local development origins. `APP_ORIGINS` replaces the defaults for another deployment. Never place provider or service-role keys in browser code, Git, chat or `VITE_*` variables.

The provider adapter bounds generation attempts, validates all output locally, and supports a JSON-mode compatibility retry after constrained-schema rejection. Template data is never presented as a successful provider response.

## Replanning

Open an event → Budget → Adjust budget and guest count. Enter new values, choose category locks and preview. Applying changes preserves expenses, tasks, vendors and saved ideas. Account users explicitly Save to account, then request fresh AI suggestions if desired. Guest counts do not automatically scale vendor quotes.

See [replanning behavior and tests](docs/REPLANNING.md) for allocation rules, stale-preview protection and optional lock metadata.

## Repository workflow

This repository contains the consolidated Eventora AI application on main, including Phase 7 maintainability improvements. It was migrated from the development snapshot 7efe66eb0f6040d552ee5380c7ae692c3d6f1a06. The original repository and its phase PRs remain unchanged. This repository has fresh history and is not automatically connected to the old Lovable project.

Use npm and package-lock.json for dependency installation. The UI, templates, account storage, Gemini integration, migrations, tests and CI workflow are included.

## Submission readiness

See [rubric mapping and release checklist](docs/SUBMISSION.md). Phase 7 adds focused workspace components, separate context contracts and providers, zero-warning lint in CI, bounded-polling lifecycle tests and accessible expense validation. Verify each deployment on its final origin; comprehensive accessibility testing remains a release gate.
