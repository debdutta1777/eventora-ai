import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPlannerDatabase } from "./supabase-adapter";
import { aiEvent, aiFixture, runFixture, USER_A, RUN_ID } from "@/test/ai-fixtures";

const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const adapter = (fetcher: typeof fetch) =>
  createPlannerDatabase(
    createClient("https://example.supabase.co", "synthetic-public-key", {
      global: { fetch: fetcher },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  );

describe("AI database adapter REST contract", () => {
  it("filters event reads by both owner and event identity", async () => {
    const event = aiEvent();
    const fetcher = vi.fn().mockResolvedValue(response({ record: event, revision: 1 }));
    expect(await adapter(fetcher).event(USER_A, event.id)).toEqual({ record: event, revision: 1 });
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_A}`);
    expect(url.searchParams.get("id")).toBe(`eq.${event.id}`);
  });
  it.each([
    ["P0001", 429],
    ["40001", 409],
    ["P0002", 404],
    ["unknown", 500],
  ])("maps database code %s without exposing raw messages", async (code, status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ code, message: "synthetic-private-detail" }, 400));
    await expect(
      adapter(fetcher).reserve(USER_A, "event", 1, RUN_ID, "test"),
    ).rejects.toMatchObject({ status });
    await expect(adapter(fetcher).reserve(USER_A, "event", 1, RUN_ID, "test")).rejects.not.toThrow(
      "synthetic-private-detail",
    );
  });
  it("returns idempotent reservations and validates applied records", async () => {
    const event = aiEvent();
    const run = runFixture(event);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ created: false, run }))
      .mockResolvedValueOnce(response({ record: event, revision: 2 }))
      .mockResolvedValueOnce(response({ record: { id: "invalid" }, revision: 3 }));
    const db = adapter(fetcher);
    expect(await db.reserve(USER_A, event.id, 1, RUN_ID, "test")).toEqual({ created: false, run });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toMatchObject({
      p_user_id: USER_A,
      p_request_key: RUN_ID,
    });
    expect(await db.apply(USER_A, RUN_ID)).toEqual({ record: event, revision: 2 });
    await expect(db.apply(USER_A, RUN_ID)).rejects.toThrow();
  });
  it("restricts completion updates to the owner and an active generation", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await adapter(fetcher).finish(USER_A, RUN_ID, aiFixture(), aiEvent());
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_A}`);
    expect(url.searchParams.get("status")).toBe("eq.generating");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).status).toBe("ready");
  });
  it("marks expired persisted generations as failed so they can be retried", async () => {
    const run = { ...runFixture(), created_at: new Date(Date.now() - 130000).toISOString() };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(run))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await adapter(fetcher).status(USER_A, RUN_ID);
    expect(result).toMatchObject({ status: "failed", error_code: "generation_expired" });
    expect(JSON.parse(fetcher.mock.calls[1]![1].body).error_code).toBe("generation_expired");
  });
  it("returns null for missing events and proposals", async () => {
    const fetcher = vi.fn().mockImplementation(async () => response(null));
    const db = adapter(fetcher);
    expect(await db.event(USER_A, "missing")).toBeNull();
    expect(await db.status(USER_A, RUN_ID)).toBeNull();
  });
});
