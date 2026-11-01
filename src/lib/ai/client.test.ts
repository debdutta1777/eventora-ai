import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAIPlan, listAIPlans, readAIPlan, requestAIPlan } from "./client";
import { aiEvent, runFixture, RUN_ID } from "@/test/ai-fixtures";
const mocks = vi.hoisted(() => ({ client: null as ReturnType<typeof createClient> | null }));
vi.mock("../cloud/client", () => ({ getCloudClient: () => mocks.client }));
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const connect = (fetcher: typeof fetch) => {
  mocks.client = createClient("https://example.supabase.co", "synthetic-public-key", {
    global: { fetch: fetcher },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};
beforeEach(() => {
  mocks.client = null;
});
afterEach(() => vi.restoreAllMocks());

describe("AI frontend transport contract", () => {
  it("requires a configured client for live calls and keeps signed-out history empty", async () => {
    await expect(readAIPlan(RUN_ID)).rejects.toThrow("Sign in");
    expect(await listAIPlans("event")).toEqual([]);
  });
  it("submits the expected action and validates generation and status responses", async () => {
    const run = runFixture();
    const fetcher = vi.fn().mockImplementation(async () => response({ run }));
    connect(fetcher);
    expect(await requestAIPlan(run.event_id, 1, "Accessible celebration", RUN_ID)).toEqual(run);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
      action: "generate",
      eventId: run.event_id,
      revision: 1,
      instruction: "Accessible celebration",
      requestKey: RUN_ID,
    });
    expect(await readAIPlan(RUN_ID)).toEqual(run);
  });
  it.each([null, {}, { run: { status: "ready" } }])(
    "rejects malformed proposal responses %j",
    async (data) => {
      connect(vi.fn().mockResolvedValue(response(data)));
      await expect(readAIPlan(RUN_ID)).rejects.toThrow();
    },
  );
  it("validates applied records and rejects unsafe or missing revisions", async () => {
    const record = aiEvent();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ record, revision: 2 }))
      .mockResolvedValueOnce(response({ record, revision: 0 }));
    connect(fetcher);
    expect(await applyAIPlan(RUN_ID)).toEqual({ record, revision: 2 });
    await expect(applyAIPlan(RUN_ID)).rejects.toThrow();
  });
  it("shows sanitized server errors and retains a safe fallback for network failures", async () => {
    connect(vi.fn().mockResolvedValue(response({ error: "Planning quota reached" }, 429)));
    await expect(readAIPlan(RUN_ID)).rejects.toThrow("Planning quota reached");
    connect(vi.fn().mockRejectedValue(new Error("synthetic-private-network-detail")));
    await expect(readAIPlan(RUN_ID)).rejects.toThrow("temporarily unavailable");
  });
  it("bounds and validates proposal history", async () => {
    const run = runFixture();
    const fetcher = vi.fn().mockResolvedValue(response([run]));
    connect(fetcher);
    expect(await listAIPlans(run.event_id)).toEqual([run]);
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.searchParams.get("event_id")).toBe(`eq.${run.event_id}`);
    expect(url.searchParams.get("limit")).toBe("5");
  });
});
