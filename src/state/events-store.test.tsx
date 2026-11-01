import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventsProvider } from "./events-store";
import { useEvents } from "./events-context";
import { loadStoredEvents } from "@/lib/storage";
import { createEventFromBrief, newId } from "@/lib/templates";
import { eventSchema } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
let store: ReturnType<typeof useEvents>;
function Probe() {
  store = useEvents();
  return <p>{store.ready ? "Ready" : "Loading"}</p>;
}
const mount = () =>
  render(
    <EventsProvider>
      <Probe />
    </EventsProvider>,
  );
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("browser storage journey", () => {
  it("creates, edits, remounts and resets without losing or duplicating nested data", async () => {
    vi.stubGlobal("crypto", {}); // HTTP preview: randomUUID is absent.
    const first = mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.events).toHaveLength(3);
    let event = store.events[0]!;
    act(() => {
      event = store.createEvent({
        ...event.brief,
        name: "Ishita turns 5",
        type: "birthday",
        date: todayISO(),
        totalBudgetPaise: 7500000,
      });
    });
    const category = event.budget.categories[0]!;
    const task = event.tasks[0]!;
    const vendor = event.vendorGroups[0]!.items[0]!;
    const idea = event.ideas[0]!;
    act(() => {
      store.addExpense(event.id, category.id, { label: "Cake advance", amountPaise: 400000 });
      store.updateAllocation(event.id, category.id, 1234500);
      store.updateContingency(event.id, 12345);
      store.toggleTask(event.id, task.id);
      store.addTask(event.id, {
        title: "Confirm cake delivery",
        category: "Food",
        dueDate: todayISO(),
      });
      store.setVendorStatus(event.id, vendor.id, "contacted");
      store.toggleIdeaSaved(event.id, idea.id);
    });
    const edited = store.getEvent(event.id)!;
    expect(eventSchema.safeParse(edited).success).toBe(true);
    expect(edited.budget.categories[0]!.expenses[0]!.amountPaise).toBe(400000);
    await waitFor(() => expect(loadStoredEvents()?.find((e) => e.id === event.id)).toEqual(edited));
    first.unmount();
    const second = mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.events).toHaveLength(4);
    expect(store.getEvent(event.id)).toEqual(edited);
    act(() => {
      store.toggleVendorDone(event.id, vendor.id, true);
    });
    expect(store.getEvent(event.id)!.vendorGroups[0]!.items[0]!.status).toBe("confirmed");
    act(() => {
      store.toggleVendorDone(event.id, vendor.id, false);
      store.deleteExpense(event.id, category.id, edited.budget.categories[0]!.expenses[0]!.id);
    });
    expect(store.getEvent(event.id)!.budget.categories[0]!.expenses).toEqual([]);
    act(() => store.resetToSamples());
    expect(store.events).toHaveLength(3);
    expect(store.getEvent(event.id)).toBeUndefined();
    second.unmount();
    mount();
    await waitFor(() => expect(store.ready).toBe(true));
    expect(store.events).toHaveLength(3);
  });
  it("produces unique nested IDs without randomUUID, even at a fixed timestamp", () => {
    vi.stubGlobal("crypto", {});
    vi.spyOn(Date, "now").mockReturnValue(123);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(new Set(Array.from({ length: 100 }, () => newId("event"))).size).toBe(100);
    const e = createEventFromBrief({
      name: "Test event",
      type: "birthday",
      date: todayISO(),
      city: "Pune",
      guestCount: 5,
      totalBudgetPaise: 12345,
      priorities: [],
      theme: "",
      foodPreference: "",
      accessibility: "",
      notes: "",
    });
    expect(eventSchema.safeParse(e).success).toBe(true);
  });
  it("reports storage failure without breaking in-memory editing", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    mount();
    await waitFor(() => expect(store.storageWarning).toMatch(/only in memory/));
    expect(store.events).toHaveLength(3);
    act(() => store.toggleTask(store.events[0]!.id, store.events[0]!.tasks[0]!.id));
    expect(store.ready).toBe(true);
    expect(store.storageWarning).toBeTruthy();
  });
});
