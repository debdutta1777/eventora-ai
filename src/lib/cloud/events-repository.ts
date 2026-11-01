import type { SupabaseClient } from "@supabase/supabase-js";
import { eventSchema } from "@/lib/schemas";
import type { EventRecord } from "@/lib/types";

export interface StoredEvent {
  record: EventRecord;
  revision: number;
}
export interface EventsRepository {
  list(): Promise<StoredEvent[]>;
  save(record: EventRecord, expectedRevision: number): Promise<StoredEvent>;
}
export const eventFingerprint = (event: EventRecord): string =>
  JSON.stringify(eventSchema.parse(event));
export class SaveConflictError extends Error {
  constructor() {
    super(
      "This event changed in another session. Your edits are still here. Reload account events to use the saved version, or copy your changes before reloading.",
    );
  }
}
function readStored(value: unknown): StoredEvent {
  const row = value as { record?: unknown; revision?: unknown } | null;
  if (!row || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1)
    throw new Error("Account returned an invalid event revision.");
  return { record: eventSchema.parse(row.record), revision: Number(row.revision) };
}

/** The caller's Supabase session is sent by the SDK; no owner IDs are accepted from UI input. */
export function createEventsRepository(client: SupabaseClient): EventsRepository {
  return {
    async list() {
      const result: StoredEvent[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client
          .from("events")
          .select("record,revision")
          .order("id")
          .range(offset, offset + 99);
        if (error) throw new Error(error.message);
        result.push(...(data ?? []).map(readStored));
        if (!data || data.length < 100) return result;
      }
    },
    async save(event, expectedRevision) {
      const record = eventSchema.parse(event);
      const { data, error } = await client.rpc("save_event", {
        p_record: record,
        p_expected_revision: expectedRevision,
      });
      if (error) {
        if (error.code === "40001") throw new SaveConflictError();
        throw new Error(error.message);
      }
      return readStored(data);
    },
  };
}
