# Submission and evaluation guide

Eventora addresses weddings, birthdays and community events through budgets, dated preparation tasks, vendor checklists and personalized ideas. Starter templates work without provider calls. Private accounts and a server-side Gemini adapter enable reviewed personalized proposals. Budget and guest changes preserve recorded work and enforce category locks.

## Rubric mapping

| Criterion | Implementation evidence | Repeatable checks |
| --- | --- | --- |
| Code quality | Typed models, shared schemas, isolated account repository, provider/service/domain separation, shared allocation rules | TypeScript; focused ESLint checks; versioned migrations and npm lockfile |
| Problem alignment | Three event types; budgets and contingency; timelines; vendor action checklists; ideas; reviewed replanning and AI proposals | Synthetic template, domain, service, UI and persistence tests |
| Security | Owner-based RLS, explicit grants, verified identity, server-only provider key, expected revisions, bounded requests | PGlite isolation/grant tests and service authorization tests |
| Efficiency | Integer money, bounded generation/retries, paginated event reads, explicit saves | Request bounds, quota, duplicate request and save tests; no load benchmark claimed |
| Testing | Vitest and Testing Library; actual migrations executed in PGlite; CI workflow | Run npm run check; CI runs on pull requests and main pushes |
| Accessibility | Skip link, named navigation, current-page semantics, mobile drawer description, semantic card headings, step/error focus, form submission, reduced-motion support and wrapping task titles | Wizard focus/review tests; manual keyboard and viewport checks before release |

## Local verification

Use Node.js 22+, npm ci, then npm run check. The automated suite has 101 tests across 18 files using synthetic fixtures. It exercises all three event templates, exact fractional and tiny-budget allocation, safe integer limits, ownership isolation, revision conflicts, AI output validation, quotas, lock enforcement, preview/apply/cancel and wizard keyboard focus. No Gemini credentials are needed for these tests. CI is configured in .github/workflows/checks.yml; local success does not assert hosted CI execution.

## Demonstration sequence

1. Explore the template samples and their Overview, Budget, Tasks, Vendors and Ideas tabs.
2. Create a synthetic event through Basics → Preferences → Review. Confirm the review matches the created budget.
3. Add a test expense and complete a task; verify totals and status.
4. Sign in using an evaluator-owned account and explicitly save a synthetic event.
5. Request a real AI proposal, review all four sections and assumptions, apply, then reload. A failed provider call must show an error without changing the plan.
6. Change budget/guest count, lock a category, preview and apply. Save and reload, then regenerate AI suggestions and verify the lock and prior work remain intact.
7. Use keyboard navigation, including the skip link, step changes, validation errors, tabs and modal close behavior. Check a narrow viewport with long names and task titles.

Use synthetic data for public demos. Do not publish account-derived screenshots, event records, authentication details or private acceptance results in the repository.

## Before submitting

- Review the consolidated source on this repository’s main branch. The original development PRs are retained in the prior repository for reference and do not need to be merged to use this snapshot.
- Confirm the repository is public, matches the required submission link format and satisfies the platform’s under-10-MB repository rule. A local source-byte count excludes Git history and does not certify GitHub repository size.
- Keep node_modules, build output, local environment files and provider credentials out of Git. Use package-lock.json and npm ci as the documented reproducible installation path.
- Apply all three database migrations and deploy the planner Edge Function with its relative modules. Keep JWT verification enabled.
- Configure GEMINI_API_KEY server-side; GEMINI_MODEL is optional. Add the final frontend origin to APP_ORIGINS before publication. Check provider quota/billing limits for the intended audience.
- Review Supabase Auth password protection and email confirmation settings. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Deploy the frontend using the repository’s TanStack Start/Nitro build, then perform the synthetic demonstration flow on the final hosted origin.
- Check narrow-screen layout, browser zoom, contrast and assistive technology. This phase does not certify full WCAG conformance or production load capacity.

Ranking and scores depend on the evaluator. This guide documents code and repeatable checks; it does not promise a leaderboard outcome.
