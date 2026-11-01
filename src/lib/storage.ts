import type { EventRecord } from "./types";

/** Shared storage key — bump the suffix when the persisted shape changes. */
const STORAGE_KEY = "eventora.events.v1";

import { eventSchema } from "./schemas";
export function isEventRecord(value: unknown): value is EventRecord {
  return eventSchema.safeParse(value).success;
}

/** Returns the stored events, or null when nothing valid is stored. */
export function loadStoredEvents(): EventRecord[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(isEventRecord);
    return parsed.length === 0 ? [] : valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export function saveEvents(events: EventRecord[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    // Keep the workspace usable, but tell the caller that persistence failed.
    return false;
  }
}
