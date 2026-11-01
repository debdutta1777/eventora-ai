import { z } from "zod";
import { eventSchema } from "../schemas.ts";
import type { EventRecord } from "../types.ts";
import { materializeAIPlan, validateVendorChecklist, type PlanRun, type AIPlan } from "./plan.ts";
import { PlannerError, type ModelProvider } from "./gemini.ts";

export interface PlannerDatabase {
  event(userId: string, eventId: string): Promise<{ record: EventRecord; revision: number } | null>;
  reserve(
    userId: string,
    eventId: string,
    revision: number,
    requestKey: string,
    model: string,
  ): Promise<{ created: boolean; run: PlanRun }>;
  finish(userId: string, runId: string, proposal: AIPlan, record: EventRecord): Promise<void>;
  fail(userId: string, runId: string, code: string): Promise<void>;
  status(userId: string, runId: string): Promise<PlanRun | null>;
  apply(userId: string, runId: string): Promise<{ record: EventRecord; revision: number }>;
}
interface Dependencies {
  authenticate(token: string): Promise<string | null>;
  database: PlannerDatabase;
  provider: ModelProvider | null;
  model: string;
  origins: string[];
  background(task: Promise<void>): void;
}
const requestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("generate"),
      eventId: z.string().min(1).max(100),
      revision: z.number().int().positive(),
      requestKey: z.string().uuid(),
      instruction: z.string().trim().min(1).max(1500),
    })
    .strict(),
  z.object({ action: z.literal("status"), runId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("apply"), runId: z.string().uuid() }).strict(),
]);
export function createPlannerHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const allowed = !origin || deps.origins.includes(origin);
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Origin": allowed ? (origin ?? deps.origins[0] ?? "") : "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
    };
    const respond = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return respond({ error: "This application origin is not allowed." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
    try {
      const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) throw new PlannerError("unauthenticated", "Sign in to use AI planning.", 401);
      const userId = await deps.authenticate(token);
      if (!userId)
        throw new PlannerError("unauthenticated", "Your session expired. Sign in again.", 401);
      if (Number(request.headers.get("content-length") ?? 0) > 10000)
        throw new PlannerError("invalid_request", "Request too large.", 413);
      const text = await request.text();
      if (text.length > 10000) throw new PlannerError("invalid_request", "Request too large.", 413);
      const input = requestSchema.parse(JSON.parse(text));
      if (input.action === "status") {
        const run = await deps.database.status(userId, input.runId);
        if (!run) throw new PlannerError("not_found", "Proposal unavailable.", 404);
        return respond({ run });
      }
      if (input.action === "apply") {
        const storedRun = await deps.database.status(userId, input.runId);
        if (storedRun?.status === "ready" && storedRun.proposal) {
          try {
            validateVendorChecklist(storedRun.proposal);
          } catch {
            throw new PlannerError(
              "invalid_vendor_checklist",
              "This proposal needs refreshed vendor checklists. Generate a fresh proposal before applying.",
              422,
            );
          }
        }
        return respond(await deps.database.apply(userId, input.runId));
      }
      if (!deps.provider)
        throw new PlannerError(
          "not_configured",
          "AI planning isn't available yet. Your saved plan is still usable.",
          503,
        );
      const stored = await deps.database.event(userId, input.eventId);
      if (!stored) throw new PlannerError("not_found", "Event unavailable.", 404);
      if (stored.revision !== input.revision)
        throw new PlannerError(
          "stale_event",
          "This event changed. Reload it before generating.",
          409,
        );
      const event = eventSchema.parse(stored.record);
      // Reject infeasible or past events before consuming a generation attempt.
      if (event.brief.date < new Date().toISOString().slice(0, 10))
        throw new PlannerError(
          "invalid_event",
          "Create a future event before generating a plan.",
          422,
        );
      const paid = event.budget.categories
        .flatMap((c) => c.expenses)
        .reduce((s, e) => s + BigInt(e.amountPaise), 0n);
      if (paid > BigInt(event.brief.totalBudgetPaise))
        throw new PlannerError(
          "invalid_event",
          "Recorded expenses exceed the event budget. Review them before generating.",
          422,
        );
      const reservation = await deps.database.reserve(
        userId,
        event.id,
        stored.revision,
        input.requestKey,
        deps.model,
      );
      if (reservation.created) {
        const run = reservation.run;
        const task = (async () => {
          try {
            const proposal = await deps.provider!.generate(event, input.instruction);
            const record = materializeAIPlan(event, proposal, run.id, deps.model);
            await deps.database.finish(userId, run.id, proposal, record);
          } catch (error) {
            await deps.database.fail(
              userId,
              run.id,
              error instanceof PlannerError ? error.code : "invalid_plan",
            );
          }
        })();
        // Persisted run state enables polling/recovery if the browser disconnects.
        deps.background(task);
      }
      return respond({ run: reservation.run }, reservation.created ? 202 : 200);
    } catch (error) {
      if (error instanceof PlannerError)
        return respond({ error: error.message, code: error.code }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return respond(
          { error: "Invalid planning request or event data.", code: "invalid_request" },
          400,
        );
      return respond(
        {
          error: "Planning request failed. Your existing event is unchanged.",
          code: "request_failed",
        },
        500,
      );
    }
  };
}
