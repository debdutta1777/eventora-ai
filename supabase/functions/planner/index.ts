import { createClient } from "@supabase/supabase-js";
import { createPlannerHandler } from "../../../src/lib/ai/service.ts";
import { createPlannerDatabase } from "../../../src/lib/ai/supabase-adapter.ts";
import { createGeminiProvider } from "../../../src/lib/ai/gemini.ts";
import { plannerOrigins } from "../../../src/lib/ai/origins.ts";

declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const key = Deno.env.get("GEMINI_API_KEY");
const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = plannerOrigins(Deno.env.get("APP_ORIGINS"));
Deno.serve(
  createPlannerHandler({
    model,
    provider: key && /^[a-zA-Z0-9.-]{1,100}$/.test(model) ? createGeminiProvider(key, model) : null,
    database: createPlannerDatabase(admin),
    origins,
    authenticate: async (token) => {
      const {
        data: { user },
        error,
      } = await auth.auth.getUser(token);
      return error ? null : (user?.id ?? null);
    },
    background: (task) =>
      EdgeRuntime.waitUntil(
        task.catch(() => console.error("Eventora planning progress could not be persisted")),
      ),
  }),
);
