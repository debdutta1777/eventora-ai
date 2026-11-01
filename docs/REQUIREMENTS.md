# Requirements and acceptance evidence

The required product is a GenAI-powered planning assistant for weddings, birthdays and community events, with budgets, timelines, vendor checklists and personalized ideas. All three types share the same complete workflow; starter templates are labeled separately from authenticated Gemini proposals.

| Requirement | User-facing behavior | Automated evidence |
| --- | --- | --- |
| Weddings, birthdays, community events | Event-type selection, matching starter budget/checklists and examples | templates.test.ts; event-form.test.ts exercises all three through brief, provider prompt and proposal materialization |
| Budget planning | Integer-paise allocations, contingency, expense tracking, overspending feedback and locked allocations during replanning | format.test.ts; replanning.test.ts; expense-form.test.ts; plan.test.ts |
| Timelines | Calendar due dates, relative urgency, preparation warnings and completed-task tracking | templates.test.ts; format.test.ts; create.test.tsx; accessibility.test.tsx |
| Vendor checklists | Generic actions, questions and Needed → Confirmed status; no fabricated supplier directory | plan.test.ts; service.test.ts; database.test.ts |
| Personalized ideas | Theme, food, accessibility and priorities enter the model prompt; costed ideas include rationale and steps | event-form.test.ts; gemini.test.ts; ai-planner.test.tsx |
| Real GenAI | Authenticated server-side Google Gemini request; validated proposal, explicit review/apply and recoverable history | gemini.test.ts; service.test.ts; client.test.ts; supabase-adapter.test.ts; ai-planner.test.tsx |
| Private persistence | Owner-only records, explicit saves, expected revisions, conflict handling and reload | cloud/database.test.ts; account-workspace.test.tsx; events-repository.test.ts |

CI uses synthetic fixtures and mocked model responses, including genuine Postgres migration execution in PGlite. Live Gemini requires the deployment's server-side key, a signed-in user and available quota. Do not describe templates or test fixtures as live model output.

See SUBMISSION.md for rubric mapping and remaining release checks. Scores and rankings are external judgments; this document records testable behavior and does not promise a leaderboard result or full WCAG certification.
