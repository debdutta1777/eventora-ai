import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { EventsProvider, useEvents } from "./events-store";
import { createEventFromBrief } from "@/lib/templates";
import { loadStoredEvents, saveEvents } from "@/lib/storage";
import { eventFingerprint, type StoredEvent } from "@/lib/cloud/events-repository";
import { todayISO } from "@/lib/format";
const mocks = vi.hoisted(() => ({ userId: "alice", list: vi.fn(), save: vi.fn() }));
vi.mock("./auth", () => ({
  useAuth: () => ({
    ready: true,
    error: null,
    session: mocks.userId ? { user: { id: mocks.userId } } : null,
  }),
}));
vi.mock("@/lib/cloud/client", () => ({ getCloudClient: () => ({}) }));
vi.mock("@/lib/cloud/events-repository", async (original) => ({
  ...(await original<typeof import("@/lib/cloud/events-repository")>()),
  createEventsRepository: () => ({ list: mocks.list, save: mocks.save }),
}));
let store: ReturnType<typeof useEvents>;
function Probe() {
  store = useEvents();
  return null;
}
const mount = () =>
  render(
    <EventsProvider>
      <Probe />
    </EventsProvider>,
  );
const draft = () =>
  createEventFromBrief({
    name: "Private birthday",
    type: "birthday",
    date: todayISO(),
    city: "Pune",
    guestCount: 50,
    totalBudgetPaise: 7500000,
    priorities: ["Food"],
    theme: "Garden",
    foodPreference: "Veg",
    accessibility: "",
    notes: "",
  });
beforeEach(() => {
  localStorage.clear();
  mocks.userId = "alice";
  mocks.list.mockReset().mockResolvedValue([]);
  mocks.save.mockReset();
});
afterEach(cleanup);
describe("account workspace isolation and saves", () => {
  it("applies reviewed replans only to the same current snapshot and requires an explicit save", async () => {
    const e = draft();
    mocks.list.mockResolvedValue([{ record: e, revision: 1 }]);
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    const revised = { ...e, brief: { ...e.brief, guestCount: 80 } };
    await act(async () => {
      expect(store.applyReplan(revised, "stale")).toBe(false);
    });
    expect(store.getEvent(e.id)?.brief.guestCount).toBe(50);
    await act(async () => {
      expect(store.applyReplan(revised, eventFingerprint(e))).toBe(true);
    });
    expect(store.getEvent(e.id)?.brief.guestCount).toBe(80);
    expect(store.getSaveState(e.id)).toBe("unsaved");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not silently import browser drafts or overwrite demo storage", async () => {
    const local = draft();
    saveEvents([local]);
    const raw = localStorage.getItem("eventora.events.v1");
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.events).toEqual([]);
    expect(store.mode).toBe("account");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(localStorage.getItem("eventora.events.v1")).toBe(raw);
    act(() => store.importLocalDrafts());
    act(() => store.importLocalDrafts());
    expect(store.events).toEqual([local]);
    expect(store.hasUnsavedChanges).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(loadStoredEvents()).toEqual([local]);
  });
  it("round-trips budget, tasks, vendors and ideas through explicit save and remount", async () => {
    const e = draft();
    mocks.list.mockResolvedValueOnce([{ record: e, revision: 1 }]);
    const first = mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.getSaveState(e.id)).toBe("saved");
    act(() => {
      store.addExpense(e.id, e.budget.categories[0]!.id, { label: "Advance", amountPaise: 400000 });
      store.toggleTask(e.id, e.tasks[0]!.id);
      store.setVendorStatus(e.id, e.vendorGroups[0]!.items[0]!.id, "contacted");
      store.toggleIdeaSaved(e.id, e.ideas[0]!.id);
    });
    const edited = store.getEvent(e.id)!;
    expect(store.getSaveState(e.id)).toBe("unsaved");
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.save.mockResolvedValue({ record: edited, revision: 2 });
    await act(() => store.saveEvent(e.id));
    expect(mocks.save).toHaveBeenCalledWith(edited, 1);
    expect(store.getSaveState(e.id)).toBe("saved");
    expect(localStorage.getItem("eventora.events.v1")).toBeNull();
    first.unmount();
    mocks.list.mockResolvedValue([{ record: edited, revision: 2 }]);
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.getEvent(e.id)).toEqual(edited);
  });
  it("keeps newer edits dirty while an older snapshot is being saved, and suppresses duplicate clicks", async () => {
    const e = draft();
    mocks.list.mockResolvedValue([{ record: e, revision: 1 }]);
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    act(() => store.toggleTask(e.id, e.tasks[0]!.id));
    const snapshot = store.getEvent(e.id)!;
    let resolve!: (value: StoredEvent) => void;
    mocks.save.mockImplementation(
      () =>
        new Promise<StoredEvent>((r) => {
          resolve = r;
        }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = store.saveEvent(e.id);
      void store.saveEvent(e.id);
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(store.getSaveState(e.id)).toBe("saving");
    act(() =>
      store.addExpense(e.id, e.budget.categories[0]!.id, { label: "New edit", amountPaise: 12345 }),
    );
    await act(async () => {
      resolve({ record: snapshot, revision: 2 });
      await pending;
    });
    expect(store.getSaveState(e.id)).toBe("unsaved");
    expect(eventFingerprint(store.getEvent(e.id)!)).not.toBe(eventFingerprint(snapshot));
  });
  it("retains unsaved edits after save failure and permits retry", async () => {
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    let e!: ReturnType<typeof draft>;
    act(() => {
      e = store.createEvent(draft().brief);
    });
    mocks.save.mockRejectedValueOnce(new Error("Network unavailable"));
    await act(() => store.saveEvent(e.id));
    expect(store.accountError).toMatch(/Network/);
    expect(store.getEvent(e.id)).toEqual(e);
    expect(store.getSaveState(e.id)).toBe("unsaved");
    mocks.save.mockResolvedValue({ record: e, revision: 1 });
    await act(() => store.saveEvent(e.id));
    expect(store.getSaveState(e.id)).toBe("saved");
    expect(store.accountError).toBeNull();
  });
  it("clears the old identity immediately and ignores late private load results", async () => {
    let resolve!: (rows: StoredEvent[]) => void;
    mocks.list.mockImplementationOnce(
      () =>
        new Promise<StoredEvent[]>((r) => {
          resolve = r;
        }),
    );
    const view = mount();
    const alice = draft();
    mocks.userId = "bob";
    mocks.list.mockResolvedValueOnce([]);
    view.rerender(
      <EventsProvider>
        <Probe />
      </EventsProvider>,
    );
    await waitFor(() => expect(store.ready).toBe(true));
    await act(async () => {
      resolve([{ record: alice, revision: 1 }]);
    });
    expect(store.events).toEqual([]);
    mocks.userId = "";
    view.rerender(
      <EventsProvider>
        <Probe />
      </EventsProvider>,
    );
    await waitFor(() => expect(store.mode).toBe("demo"));
    expect(store.events).toHaveLength(3);
    expect(store.getEvent(alice.id)).toBeUndefined();
  });
  it("cannot reset private account events to samples", async () => {
    const e = draft();
    mocks.list.mockResolvedValue([{ record: e, revision: 1 }]);
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    act(() => store.resetToSamples());
    expect(store.events).toEqual([e]);
  });
});
