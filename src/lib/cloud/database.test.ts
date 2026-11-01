// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createEventFromBrief } from "@/lib/templates";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
const event = () =>
  createEventFromBrief({
    name: "Birthday test",
    type: "birthday",
    date: "2030-01-10",
    city: "Kolkata",
    guestCount: 50,
    totalBudgetPaise: 7500000,
    priorities: ["Food"],
    theme: "Garden",
    foodPreference: "Vegetarian",
    accessibility: "Step-free",
    notes: "",
  });
const asUser = async (id: string) => {
  await db.exec("reset role;set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
};
const save = (record: unknown, revision = 0) =>
  db.query<{ save_event: { record: unknown; revision: number } }>(
    "select public.save_event($1::jsonb,$2::integer)",
    [JSON.stringify(record), revision],
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;create role anon;create role authenticated;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 insert into auth.users(id) values('${A}'),('${B}');`);
  await db.exec(
    readFileSync(
      new URL("../../../supabase/migrations/20261101005011_account_events.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("actual Postgres grants, RLS and revision checks", () => {
  it("saves and reads all nested planning sections for the owner", async () => {
    await asUser(A);
    const e = event();
    e.budget.categories[0]!.expenses = [{ id: "paid", label: "Advance", amountPaise: 400000 }];
    e.tasks[0]!.completed = true;
    e.vendorGroups[0]!.items[0]!.status = "contacted";
    e.ideas[0]!.saved = true;
    const result = await save(e);
    expect(result.rows[0]!.save_event).toEqual({ record: e, revision: 1 });
    const read = await db.query<{ record: unknown }>(
      "select record from public.events where id=$1",
      [e.id],
    );
    expect(read.rows[0]!.record).toEqual(e);
  });
  it("isolates two owners even when their local event IDs match", async () => {
    const e = event();
    await asUser(A);
    await save(e);
    await asUser(B);
    expect((await db.query("select * from public.events where id=$1", [e.id])).rows).toHaveLength(
      0,
    );
    expect(
      (
        await db.query(
          "update public.events set record=record,revision=revision+1 where user_id=$1 and id=$2 returning id",
          [A, e.id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("delete from public.events where user_id=$1 and id=$2 returning id", [
          A,
          e.id,
        ])
      ).rows,
    ).toHaveLength(0);
    await expect(save({ ...e, brief: { ...e.brief, name: "Attack" } }, 1)).rejects.toMatchObject({
      code: "40001",
    });
    await save({ ...e, brief: { ...e.brief, name: "B's own copy" } });
    await asUser(A);
    const rows = await db.query<{ record: { brief: { name: string } } }>(
      "select record from public.events where id=$1",
      [e.id],
    );
    expect(rows.rows[0]!.record.brief.name).toBe(e.brief.name);
  });
  it("rejects forged owners and prevents reassignment", async () => {
    await asUser(A);
    const e = event();
    await expect(
      db.query("insert into public.events(user_id,id,record) values($1,$2,$3)", [
        B,
        e.id,
        JSON.stringify(e),
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await save(e);
    await expect(
      db.query("update public.events set user_id=$1,revision=revision+1 where id=$2", [B, e.id]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("blocks anonymous reads and writes and authenticates the RPC itself", async () => {
    await db.exec("reset role;set role anon;");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await expect(db.query("select * from public.events")).rejects.toMatchObject({ code: "42501" });
    await expect(save(event())).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role;set role authenticated;");
    await expect(save(event())).rejects.toMatchObject({ code: "42501" });
  });
  it("rejects stale saves and duplicate creates without duplicating rows", async () => {
    await asUser(A);
    const e = event();
    await save(e);
    await save({ ...e, brief: { ...e.brief, name: "Updated" } }, 1);
    await expect(save(e, 1)).rejects.toMatchObject({ code: "40001" });
    await expect(save(e, 0)).rejects.toMatchObject({ code: "40001" });
    const rows = await db.query<{ revision: number }>(
      "select revision from public.events where id=$1",
      [e.id],
    );
    expect(rows.rows).toEqual([{ revision: 2 }]);
  });
  it("rejects corrupted nested records and invalid money at the database boundary", async () => {
    await asUser(A);
    for (const change of [
      (e: ReturnType<typeof event>) => (e.budget.categories[0]!.allocatedPaise = -1),
      (e: ReturnType<typeof event>) => (e.tasks[0]!.dueDate = "2030-02-30"),
      (e: ReturnType<typeof event>) => (e.tasks[1]!.id = e.tasks[0]!.id),
      (e: ReturnType<typeof event>) => (e.budget.contingencyPaise = 1.5),
      (e: ReturnType<typeof event>) => (e.isSample = true),
    ]) {
      const e = event();
      change(e);
      await expect(save(e)).rejects.toMatchObject({ code: "23514" });
    }
  });
  it("requires revision increments even for direct API writes", async () => {
    await asUser(A);
    const e = event();
    await save(e);
    await expect(
      db.query("update public.events set record=record where id=$1", [e.id]),
    ).rejects.toMatchObject({ code: "40001" });
  });
});
