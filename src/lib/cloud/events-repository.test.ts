import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, vi } from "vitest";
import { createEventsRepository, SaveConflictError } from "./events-repository";
import { buildSampleEvents } from "@/lib/demo-data";
const make = () => ({ ...buildSampleEvents()[0]!, isSample: false });
const client = (fetcher: typeof fetch) =>
  createClient("https://example.supabase.co", "public-test-key", {
    global: { fetch: fetcher },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
describe("Supabase event repository contract", () => {
  it("paginates owner-filtered RLS results and validates records", async () => {
    const e = make();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          Array.from({ length: 100 }, (_, i) => ({
            record: { ...e, id: `event-${i}` },
            revision: 1,
          })),
        ),
      )
      .mockResolvedValueOnce(response([{ record: { ...e, id: "last-event" }, revision: 2 }]));
    const events = await createEventsRepository(client(fetcher)).list();
    expect(events).toHaveLength(101);
    expect(String(fetcher.mock.calls[1]![0])).toContain("offset=100");
  });
  it("sends the validated event and expected revision, without a caller-supplied owner", async () => {
    const e = make();
    const fetcher = vi.fn().mockResolvedValue(response({ record: e, revision: 2 }));
    const result = await createEventsRepository(client(fetcher)).save(e, 1);
    expect(result).toEqual({ record: e, revision: 2 });
    const body = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(body).toEqual({ p_record: e, p_expected_revision: 1 });
    expect(body.user_id).toBeUndefined();
  });
  it("reports conflicts and rejects malformed responses", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ code: "40001", message: "Event revision conflict" }, 409));
    await expect(createEventsRepository(client(fetcher)).save(make(), 1)).rejects.toBeInstanceOf(
      SaveConflictError,
    );
    const broken = vi
      .fn()
      .mockResolvedValue(response([{ record: { id: "missing fields" }, revision: 1 }]));
    await expect(createEventsRepository(client(broken)).list()).rejects.toThrow();
  });
});
