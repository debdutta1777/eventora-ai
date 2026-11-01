# Phase 5: budget and guest-count replanning

Budget → Adjust budget and guest count offers a deterministic before/after preview. No API request is needed to calculate it. The allocator uses BigInt and largest remainders, so category allocations plus contingency exactly equal the total. Recorded expenses are minimum allocations. Selected locks preserve exact current allocations during deterministic replanning and server-side AI materialization. If every category is locked, the remaining budget becomes contingency. Otherwise contingency retains its previous proportion when feasible.

Guest-count changes do not assume vendor costs scale linearly. Existing tasks, dates/completion, vendor statuses, expenses and saved ideas remain intact. Previous AI rationale is marked as needing refresh after brief changes. Save and generate a new AI proposal for updated personalization.

Applying a preview changes the local workspace. Account mode requires explicit saving through the expected-revision RPC. A fingerprint guard blocks applying stale previews; saves in flight block application. Editing any preview input clears the previous preview.

Category `locked` and AI metadata `needsRefresh` are optional booleans. The new invoker validation function and CHECK constraint reject malformed lock metadata. Existing ownership RLS and revision checks remain active. Anonymous validator access is revoked.

## Automated checks

92 tests across 16 files, TypeScript and production build pass locally. Tests use synthetic fixtures and cover fractional and safe-maximum money totals, all-locked and zero-weight allocation, infeasible locks, invalid guests, preserved work, AI lock enforcement, stale/cancelled previews, explicit save behavior and Postgres validation of lock metadata.

New AI vendor suggestions must begin with a checklist action verb in both title and note. Provider prompts explicitly forbid supplier names and unverified service claims. New generation and apply requests validate this contract; historical records remain readable. This is a bounded format safeguard, not verification of any supplier or quote.
