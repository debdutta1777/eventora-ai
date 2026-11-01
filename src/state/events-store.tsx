import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from "react";

import { useAuth } from "./auth-context";
import { EventsContext, type EventsStore } from "./events-context";
import { getCloudClient } from "@/lib/cloud/client";
import {
  createEventsRepository,
  eventFingerprint,
  type StoredEvent,
} from "@/lib/cloud/events-repository";
import { buildSampleEvents, refreshSampleDates } from "@/lib/demo-data";
import { loadStoredEvents, saveEvents } from "@/lib/storage";
import { createEventFromBrief, newId } from "@/lib/templates";
import type { EventRecord } from "@/lib/types";

export function EventsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready)
    return (
      <p role="status" className="p-6">
        Restoring your workspace…
      </p>
    );
  if (auth.error)
    return (
      <p role="alert" className="p-6">
        {auth.error}
      </p>
    );
  // Identity changes remount all workspace state, isolating pending requests and private records.
  const owner = auth.session?.user.id ?? null;
  return (
    <Workspace key={owner ?? "demo"} owner={owner}>
      {children}
    </Workspace>
  );
}

function Workspace({ children, owner }: { children: ReactNode; owner: string | null }) {
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, { revision: number; fingerprint: string }>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const active = useRef(true);
  const inFlight = useRef(new Set<string>());
  const reloading = useRef(false);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const repository = useMemo(() => {
    if (!owner) return null;
    const client = getCloudClient();
    return client ? createEventsRepository(client) : null;
  }, [owner]);
  const acceptLoaded = useCallback((rows: StoredEvent[]) => {
    setEvents(rows.map((row) => row.record));
    setSaved(
      Object.fromEntries(
        rows.map((row) => [
          row.record.id,
          { revision: row.revision, fingerprint: eventFingerprint(row.record) },
        ]),
      ),
    );
  }, []);
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    if (owner) {
      if (!repository) {
        setAccountError("Account storage is not configured.");
        setReady(true);
      } else
        repository
          .list()
          .then((rows) => {
            if (!cancelled) acceptLoaded(rows);
          })
          .catch((error) => {
            if (!cancelled) setAccountError(`Could not load account events: ${error.message}`);
          })
          .finally(() => {
            if (!cancelled) setReady(true);
          });
    } else {
      setEvents(refreshSampleDates(loadStoredEvents() ?? buildSampleEvents()));
      setReady(true);
    }
    return () => {
      cancelled = true;
      active.current = false;
    };
  }, [owner, repository, acceptLoaded]);
  useEffect(() => {
    if (ready && !owner)
      setStorageWarning(
        saveEvents(events)
          ? null
          : "Browser storage is unavailable or full. Your latest edits are only in memory; keep this page open to avoid losing them.",
      );
  }, [ready, owner, events]);
  const hasUnsavedChanges =
    !!owner && events.some((event) => saved[event.id]?.fingerprint !== eventFingerprint(event));
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [hasUnsavedChanges]);
  const saveEvent = useCallback(
    async (id: string) => {
      if (!repository || reloading.current || inFlight.current.has(id)) return;
      const snapshot = eventsRef.current.find((event) => event.id === id);
      if (!snapshot) return;
      inFlight.current.add(id);
      setSaving(new Set(inFlight.current));
      setAccountError(null);
      try {
        const result = await repository.save(snapshot, saved[id]?.revision ?? 0);
        if (active.current)
          setSaved((prev) => ({
            ...prev,
            [id]: { revision: result.revision, fingerprint: eventFingerprint(result.record) },
          }));
      } catch (error) {
        if (active.current)
          setAccountError(
            error instanceof Error
              ? error.message
              : "Save failed. Your edits are still in this workspace.",
          );
      } finally {
        inFlight.current.delete(id);
        if (active.current) setSaving(new Set(inFlight.current));
      }
    },
    [repository, saved],
  );
  const reloadAccount = useCallback(async () => {
    if (!repository || reloading.current || inFlight.current.size) return;
    reloading.current = true;
    setReady(false);
    setAccountError(null);
    try {
      const rows = await repository.list();
      if (active.current) acceptLoaded(rows);
    } catch (error) {
      if (active.current)
        setAccountError(
          error instanceof Error ? error.message : "Could not reload account events.",
        );
    } finally {
      reloading.current = false;
      if (active.current) setReady(true);
    }
  }, [repository, acceptLoaded]);

  const value = useMemo<EventsStore>(() => {
    const mutate = (eventId: string, fn: (event: EventRecord) => EventRecord | undefined): void => {
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;
          const next = fn(event);
          if (!next) return event;
          return { ...next, updatedAt: new Date().toISOString() };
        }),
      );
    };

    return {
      ready,
      mode: owner ? "account" : "demo",
      accountError,
      saveEvent,
      reloadAccount,
      hasUnsavedChanges,
      getRevision: (id) => saved[id]?.revision,
      acceptAIResult: (result, expectedFingerprint) => {
        if (!active.current) return false;
        const current = eventsRef.current.find((event) => event.id === result.record.id);
        if (!current || eventFingerprint(current) !== expectedFingerprint) return false;
        setEvents((prev) =>
          prev.map((event) => (event.id === result.record.id ? result.record : event)),
        );
        setSaved((prev) => ({
          ...prev,
          [result.record.id]: {
            revision: result.revision,
            fingerprint: eventFingerprint(result.record),
          },
        }));
        return true;
      },
      applyReplan: (record, expectedFingerprint) => {
        const current = eventsRef.current.find((e) => e.id === record.id);
        if (
          !current ||
          eventFingerprint(current) !== expectedFingerprint ||
          inFlight.current.has(record.id)
        )
          return false;
        setEvents((prev) => prev.map((e) => (e.id === record.id ? record : e)));
        return true;
      },
      getSaveState: (id) => {
        if (!owner) return "local";
        if (saving.has(id)) return "saving";
        const event = events.find((candidate) => candidate.id === id);
        return event && saved[id]?.fingerprint === eventFingerprint(event) ? "saved" : "unsaved";
      },
      importLocalDrafts: () => {
        if (!owner || !ready) return;
        const drafts = (loadStoredEvents() ?? []).filter((event) => !event.isSample);
        setEvents((prev) => [
          ...prev,
          ...drafts.filter((draft) => !prev.some((event) => event.id === draft.id)),
        ]);
      },
      storageWarning,
      events,
      getEvent: (id) => events.find((e) => e.id === id),
      createEvent: (brief) => {
        if (!ready) throw new Error("Wait for your workspace to finish loading.");
        const event = createEventFromBrief(brief);
        setEvents((prev) => [...prev, event]);
        return event;
      },
      addExpense: (eventId, categoryId, expense) =>
        mutate(eventId, (event) => ({
          ...event,
          budget: {
            ...event.budget,
            categories: event.budget.categories.map((cat) =>
              cat.id === categoryId
                ? {
                    ...cat,
                    expenses: [...cat.expenses, { ...expense, id: newId("exp") }],
                  }
                : cat,
            ),
          },
        })),
      deleteExpense: (eventId, categoryId, expenseId) =>
        mutate(eventId, (event) => ({
          ...event,
          budget: {
            ...event.budget,
            categories: event.budget.categories.map((cat) =>
              cat.id === categoryId
                ? { ...cat, expenses: cat.expenses.filter((e) => e.id !== expenseId) }
                : cat,
            ),
          },
        })),
      updateAllocation: (eventId, categoryId, allocatedPaise) =>
        mutate(eventId, (event) => ({
          ...event,
          budget: {
            ...event.budget,
            categories: event.budget.categories.map((cat) =>
              cat.id === categoryId ? { ...cat, allocatedPaise } : cat,
            ),
          },
        })),
      updateContingency: (eventId, contingencyPaise) =>
        mutate(eventId, (event) => ({
          ...event,
          budget: { ...event.budget, contingencyPaise },
        })),
      addTask: (eventId, task) =>
        mutate(eventId, (event) => ({
          ...event,
          tasks: [
            ...event.tasks,
            {
              id: newId("task"),
              title: task.title,
              category: task.category,
              dueDate: task.dueDate,
              completed: false,
            },
          ],
        })),
      toggleTask: (eventId, taskId) =>
        mutate(eventId, (event) => ({
          ...event,
          tasks: event.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
        })),
      setVendorStatus: (eventId, itemId, status) =>
        mutate(eventId, (event) => ({
          ...event,
          vendorGroups: event.vendorGroups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status,
                    done:
                      status === "confirmed"
                        ? true
                        : item.status === "confirmed"
                          ? false
                          : item.done,
                  }
                : item,
            ),
          })),
        })),
      toggleVendorDone: (eventId, itemId, done) =>
        mutate(eventId, (event) => ({
          ...event,
          vendorGroups: event.vendorGroups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    done,
                    status: done
                      ? "confirmed"
                      : item.status === "confirmed"
                        ? "needed"
                        : item.status,
                  }
                : item,
            ),
          })),
        })),
      toggleIdeaSaved: (eventId, ideaId) =>
        mutate(eventId, (event) => ({
          ...event,
          ideas: event.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, saved: !idea.saved } : idea,
          ),
        })),
      resetToSamples: () => {
        if (owner) return;
        const seeded = buildSampleEvents();
        setEvents(seeded);
        saveEvents(seeded);
      },
    };
  }, [
    ready,
    events,
    storageWarning,
    owner,
    accountError,
    saveEvent,
    reloadAccount,
    hasUnsavedChanges,
    saving,
    saved,
  ]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
