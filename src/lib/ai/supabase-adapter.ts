import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannerDatabase } from "./service.ts";
import { PlannerError } from "./gemini.ts";
import type { PlanRun } from "./plan.ts";
import { eventSchema } from "../schemas.ts";
function databaseError(error: { code?: string } | null): void {
  if (!error) return;
  if (error.code === "P0001")
    throw new PlannerError(
      "quota_exceeded",
      "You have used 10 planning attempts in the last 24 hours. Please try again later.",
      429,
    );
  if (error.code === "40001")
    throw new PlannerError(
      "stale_event",
      "The event changed or a proposal is already generating. Refresh proposals before retrying.",
      409,
    );
  if (error.code === "P0002")
    throw new PlannerError("not_found", "Event or proposal unavailable.", 404);
  throw new PlannerError(
    "database_error",
    "Could not save planning progress. Your current event is unchanged.",
    500,
  );
}
export function createPlannerDatabase(admin: SupabaseClient): PlannerDatabase {
  return {
    async event(userId, eventId) {
      const { data, error } = await admin
        .from("events")
        .select("record,revision")
        .eq("user_id", userId)
        .eq("id", eventId)
        .maybeSingle();
      databaseError(error);
      return data ? { record: eventSchema.parse(data.record), revision: data.revision } : null;
    },
    async reserve(userId, eventId, revision, requestKey, model) {
      const { data, error } = await admin.rpc("reserve_ai_plan", {
        p_user_id: userId,
        p_event_id: eventId,
        p_revision: revision,
        p_request_key: requestKey,
        p_model: model,
      });
      databaseError(error);
      return data as { created: boolean; run: PlanRun };
    },
    async finish(userId, runId, proposal, record) {
      const { error } = await admin
        .from("plan_runs")
        .update({
          status: "ready",
          proposal,
          proposed_record: record,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("id", runId)
        .eq("status", "generating");
      databaseError(error);
    },
    async fail(userId, runId, code) {
      const { error } = await admin
        .from("plan_runs")
        .update({ status: "failed", error_code: code, completed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", runId)
        .eq("status", "generating");
      databaseError(error);
    },
    async status(userId, runId) {
      const { data, error } = await admin
        .from("plan_runs")
        .select("*")
        .eq("user_id", userId)
        .eq("id", runId)
        .maybeSingle();
      databaseError(error);
      if (!data) return null;
      const run = data as PlanRun;
      if (run.status === "generating" && Date.now() - new Date(run.created_at).getTime() > 120000) {
        await this.fail(userId, runId, "generation_expired");
        return { ...run, status: "failed", error_code: "generation_expired" };
      }
      return run;
    },
    async apply(userId, runId) {
      const { data, error } = await admin.rpc("apply_ai_plan", {
        p_user_id: userId,
        p_run_id: runId,
      });
      databaseError(error);
      return { record: eventSchema.parse(data.record), revision: data.revision };
    },
  };
}
