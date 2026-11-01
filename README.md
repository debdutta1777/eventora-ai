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
npm run typecheck
npm test
npm run build
```

`npm run check` runs all three checks. The current local automated suite contains 98 tests across 17 files using synthetic fixtures, including actual Postgres migration tests through PGlite. Whole-repository lint and a comprehensive assistive-technology audit remain separate checks.

The frontend supports public Supabase configuration through the checked-in development defaults or `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` overrides. Set `VITE_DEMO_ONLY=true` to disable accounts.

## Server setup

Apply the versioned SQL migrations under `supabase/migrations` in order. Deploy `supabase/functions/planner` with its referenced TypeScript modules and `deno.json`. Keep JWT verification enabled.

Set `GEMINI_API_KEY` only in Supabase Edge Function Secrets. The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` optionally overrides it. Configure `APP_ORIGINS` for the actual frontend origin before hosting. Never place provider or service-role keys in browser code, Git, chat or `VITE_*` variables.

The provider adapter bounds generation attempts, validates all output locally, and supports a JSON-mode compatibility retry after constrained-schema rejection. Template data is never presented as a successful provider response.

## Replanning

Open an event → Budget → Adjust budget and guest count. Enter new values, choose category locks and preview. Applying changes preserves expenses, tasks, vendors and saved ideas. Account users explicitly Save to account, then request fresh AI suggestions if desired. Guest counts do not automatically scale vendor quotes.

See [replanning behavior and tests](docs/REPLANNING.md) for allocation rules, stale-preview protection and optional lock metadata.

## Repository workflow

This repository contains the consolidated Phase 6 Eventora AI application on main. It was migrated from the development snapshot 7efe66eb0f6040d552ee5380c7ae692c3d6f1a06. The original repository and its phase PRs remain unchanged. This repository has fresh history and is not automatically connected to the old Lovable project.

Use npm and package-lock.json for dependency installation. The UI, templates, account storage, Gemini integration, migrations, tests and CI workflow are included.

## Submission readiness

See [rubric mapping and release checklist](docs/SUBMISSION.md). Phase 6 adds keyboard/focus improvements, shared exact budget review, wrapping task text, reduced-motion support and a CI workflow. Hosted deployment and comprehensive accessibility testing remain release gates.
