// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { aiEvent, aiFixture, USER_A, USER_B } from "@/test/ai-fixtures";
import { materializeAIPlan, type PlanRun } from "./plan";
let db: PGlite;
const role = async (name: string, user = "") => {
  await db.exec(`reset role;set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
};
const save = async (e: ReturnType<typeof aiEvent>, revision = 0) =>
  db.query("select public.save_event($1::jsonb,$2)", [JSON.stringify(e), revision]);
const reserve = async (
  e: ReturnType<typeof aiEvent>,
  key = randomUUID(),
  revision = 1,
  user = USER_A,
) => {
  const result = await db.query<{ result: { created: boolean; run: PlanRun } }>(
    "select public.reserve_ai_plan($1,$2,$3,$4,'test-model') as result",
    [user, e.id, revision, key],
  );
  return result.rows[0]!.result;
};
const setupEvent = async () => {
  const e = aiEvent();
  await role("authenticated", USER_A);
  await save(e);
  await role("service_role");
  return e;
};
const ready = async (e: ReturnType<typeof aiEvent>, run: PlanRun) => {
  const proposal = aiFixture(e);
  const next = materializeAIPlan(e, proposal, run.id, "test-model");
  await db.query(
    "update public.plan_runs set status='ready',proposal=$1,proposed_record=$2 where id=$3",
    [JSON.stringify(proposal), JSON.stringify(next), run.id],
  );
  return next;
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon,service_role;insert into auth.users(id) values('${USER_A}'),('${USER_B}');`);
  await db.exec(
    readFileSync(
      new URL("../../../supabase/migrations/20261101005011_account_events.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL("../../../supabase/migrations/20261101011912_ai_plan_proposals.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL("../../../supabase/migrations/20261101020200_allocation_locks.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
describe("AI proposal database authorization and transactions", () => {
  it("persists boolean locks and rejects malformed lock metadata", async () => {
    const e = aiEvent();
    e.budget.categories[0]!.locked = true;
    await role("authenticated", USER_A);
    await save(e);
    const stored = await db.query<{ record: typeof e }>(
      "select record from public.events where id=$1",
      [e.id],
    );
    expect(stored.rows[0]!.record.budget.categories[0]!.locked).toBe(true);
    const invalid = JSON.parse(JSON.stringify(e));
    invalid.id += "-invalid";
    invalid.budget.categories[0].locked = "yes";
    await expect(save(invalid)).rejects.toMatchObject({ code: "23514" });
  });
  it("reserves once, rejects simultaneous extra jobs, and is idempotent for a repeated key", async () => {
    const e = await setupEvent();
    const key = randomUUID();
    const first = await reserve(e, key);
    expect(first.created).toBe(true);
    expect((await reserve(e, key)).created).toBe(false);
    await expect(reserve(e)).rejects.toMatchObject({ code: "40001" });
    await db.query("update public.plan_runs set status='failed' where id=$1", [first.run.id]);
  });
  it("exposes only the owner's history and denies client writes and server RPCs", async () => {
    const e = await setupEvent();
    const { run } = await reserve(e);
    await role("authenticated", USER_B);
    expect(
      (await db.query("select * from public.plan_runs where id=$1", [run.id])).rows,
    ).toHaveLength(0);
    await role("authenticated", USER_A);
    expect(
      (await db.query("select * from public.plan_runs where id=$1", [run.id])).rows,
    ).toHaveLength(1);
    await expect(
      db.query("update public.plan_runs set status='ready' where id=$1", [run.id]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(reserve(e)).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("select public.apply_ai_plan($1,$2)", [USER_A, run.id]),
    ).rejects.toMatchObject({ code: "42501" });
    await role("service_role");
    await db.query("update public.plan_runs set status='failed' where id=$1", [run.id]);
  });
  it("applies a stored server proposal atomically and repeated application does not duplicate work", async () => {
    const e = await setupEvent();
    const { run } = await reserve(e);
    const expected = await ready(e, run);
    const apply = () =>
      db.query<{ result: { record: unknown; revision: number } }>(
        "select public.apply_ai_plan($1,$2) as result",
        [USER_A, run.id],
      );
    const first = await apply();
    const second = await apply();
    expect(first.rows[0]!.result).toEqual({ record: expected, revision: 2 });
    expect(second.rows[0]!.result).toEqual(first.rows[0]!.result);
  });
  it("rejects stale proposals and foreign-user apply attempts", async () => {
    const e = await setupEvent();
    const { run } = await reserve(e);
    await ready(e, run);
    await expect(
      db.query("select public.apply_ai_plan($1,$2)", [USER_B, run.id]),
    ).rejects.toMatchObject({ code: "P0002" });
    await role("authenticated", USER_A);
    await save({ ...e, brief: { ...e.brief, name: "Manually changed" } }, 1);
    await role("service_role");
    await expect(
      db.query("select public.apply_ai_plan($1,$2)", [USER_A, run.id]),
    ).rejects.toMatchObject({ code: "40001" });
  });
  it("enforces a rolling per-user quota, including failed attempts", async () => {
    // Use a new owner so earlier tests do not consume this quota.
    await role("postgres");
    const owner = randomUUID();
    await db.query("insert into auth.users(id) values($1)", [owner]);
    await role("authenticated", owner);
    const e = aiEvent();
    await save(e);
    await role("service_role");
    for (let i = 0; i < 10; i++) {
      const { run } = await reserve(e, randomUUID(), 1, owner);
      await db.query("update public.plan_runs set status='failed' where id=$1", [run.id]);
    }
    await expect(reserve(e, randomUUID(), 1, owner)).rejects.toMatchObject({ code: "P0001" });
  });
  it("keeps RLS enabled and all callable functions at invoker privilege", async () => {
    await role("postgres");
    const result = await db.query<{ rls: boolean }>(
      "select relrowsecurity as rls from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relname='plan_runs'",
    );
    expect(result.rows[0]!.rls).toBe(true);
    const funcs = await db.query<{ prosecdef: boolean }>(
      "select prosecdef from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in ('reserve_ai_plan','apply_ai_plan')",
    );
    expect(funcs.rows.every((row) => !row.prosecdef)).toBe(true);
  });
});
