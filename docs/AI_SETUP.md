# AI planner setup

The AI Planner uses the authenticated Supabase planner Edge Function. Credentials stay server-side. Users save an event, request a proposal, review budget/tasks/vendor checklists/ideas, and explicitly apply it.

## Configuration

In your Supabase project, set GEMINI_API_KEY in Edge Functions → Secrets. GEMINI_MODEL optionally overrides the default gemini-3.5-flash-lite. The default origin allowlist includes https://eventora-ai-phi.vercel.app, http://terminal.local:4173, http://localhost:5173 and http://localhost:4173. APP_ORIGINS, when set, replaces these defaults; include every frontend origin you intend to allow. Use exact origins without paths or trailing slashes.

Deploy supabase/functions/planner/index.ts with deno.json and its relative src/lib imports. Keep JWT verification enabled. Apply all SQL migrations in order before using generation or apply. The checked-in public development configuration continues to use the existing Eventora project; this repository migration does not create or copy a database or server secrets.

Never put provider or service-role keys in Git, browser code, chat, or VITE_* variables.

## Guarantees and limits

The backend verifies user identity and scopes event/proposal access to that owner. It reserves at most ten generation attempts per user per rolling 24 hours, reuses duplicate request keys, and uses bounded background generation with recoverable status/history. Each generation request has a 20-second timeout and a 6,000-token output cap. At most two generation attempts are made; a read-only model metadata check can distinguish request rejection from model/key access failure.

A constrained-schema rejection can use a JSON-mode compatibility retry with the same explicit contract in the prompt. All output is validated locally before materialization. Invalid output never becomes a fake template success. Vendor titles and notes must be action-oriented checklists, not supplier names or unsupported service claims; the format check is not verification of suppliers or prices.

Integer allocation preserves paid amounts and category locks. Tasks, vendor states and saved ideas remain intact. Apply is explicit, atomic, idempotent and guarded by the saved revision. The browser blocks stale previews and retains newer local edits after asynchronous changes.

Relevant bounded event preferences, category amounts and existing suggestion titles are sent to Gemini. Event names and expense labels are excluded from the provider prompt. Costs are estimates, never verified quotes.

## Verification

Run npm run check using synthetic fixtures. Before public release, use a synthetic evaluator-owned account to test generate → review → apply → reload, provider failures, stale revisions and subsequent replanning with a locked category. Keep private acceptance records outside the repository.

Review provider availability, quotas and billing for the intended audience. Validate the final hosted origin and account configuration before submission.
