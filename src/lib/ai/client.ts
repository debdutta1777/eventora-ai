import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import { getCloudClient } from "../cloud/client";
import { eventSchema } from "../schemas";
import { aiPlanSchema } from "./plan";
export const planRunSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string(),
  base_revision: z.number().int().positive(),
  base_record: eventSchema,
  status: z.enum(["generating", "ready", "applied", "failed"]),
  proposal: aiPlanSchema.nullable(),
  proposed_record: eventSchema.nullable(),
  error_code: z.string().nullable(),
  created_at: z.string(),
  model: z.string(),
});
export type ClientPlanRun = z.infer<typeof planRunSchema>;
const runResponseSchema = z.object({ run: planRunSchema });
const savedResponseSchema = z.object({
  record: eventSchema,
  revision: z.number().int().safe().positive(),
});
async function invoke(body: Record<string, unknown>): Promise<unknown> {
  const client = getCloudClient();
  if (!client) throw new Error("Sign in to use AI planning.");
  const { data, error } = await client.functions.invoke("planner", { body });
  if (error) {
    let message = "AI planning is temporarily unavailable. Your saved event is unchanged.";
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (typeof payload.error === "string") message = payload.error;
      } catch {
        /* Keep a safe, useful fallback. */
      }
    }
    throw new Error(message);
  }
  return data;
}
export async function requestAIPlan(
  eventId: string,
  revision: number,
  instruction: string,
  requestKey: string,
): Promise<ClientPlanRun> {
  return runResponseSchema.parse(
    await invoke({ action: "generate", eventId, revision, instruction, requestKey }),
  ).run;
}
export async function readAIPlan(runId: string): Promise<ClientPlanRun> {
  return runResponseSchema.parse(await invoke({ action: "status", runId })).run;
}
export async function applyAIPlan(runId: string) {
  return savedResponseSchema.parse(await invoke({ action: "apply", runId }));
}
export async function listAIPlans(eventId: string): Promise<ClientPlanRun[]> {
  const client = getCloudClient();
  if (!client) return [];
  const { data, error } = await client
    .from("plan_runs")
    .select(
      "id,event_id,base_revision,base_record,status,proposal,proposed_record,error_code,created_at,model",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("Could not load previous proposals.");
  return (data ?? []).map((row) => planRunSchema.parse(row));
}
