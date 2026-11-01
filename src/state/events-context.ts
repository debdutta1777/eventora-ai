import { createContext, useContext } from "react";
import type { StoredEvent } from "@/lib/cloud/events-repository";
import type { EventBrief, EventRecord, Expense, TaskCategory, VendorStatus } from "@/lib/types";

export interface EventsStore {
  ready: boolean;
  mode: "demo" | "account";
  accountError: string | null;
  saveEvent: (id: string) => Promise<void>;
  reloadAccount: () => Promise<void>;
  importLocalDrafts: () => void;
  getSaveState: (id: string) => "local" | "unsaved" | "saving" | "saved";
  hasUnsavedChanges: boolean;
  getRevision: (id: string) => number | undefined;
  acceptAIResult: (result: StoredEvent, expectedFingerprint: string) => boolean;
  applyReplan: (record: EventRecord, expectedFingerprint: string) => boolean;
  storageWarning: string | null;
  events: EventRecord[];
  getEvent: (id: string) => EventRecord | undefined;
  createEvent: (brief: EventBrief) => EventRecord;
  addExpense: (eventId: string, categoryId: string, expense: Omit<Expense, "id">) => void;
  deleteExpense: (eventId: string, categoryId: string, expenseId: string) => void;
  updateAllocation: (eventId: string, categoryId: string, allocatedPaise: number) => void;
  updateContingency: (eventId: string, contingencyPaise: number) => void;
  addTask: (
    eventId: string,
    task: { title: string; category: TaskCategory; dueDate: string },
  ) => void;
  toggleTask: (eventId: string, taskId: string) => void;
  setVendorStatus: (eventId: string, itemId: string, status: VendorStatus) => void;
  toggleVendorDone: (eventId: string, itemId: string, done: boolean) => void;
  toggleIdeaSaved: (eventId: string, ideaId: string) => void;
  resetToSamples: () => void;
}

export const EventsContext = createContext<EventsStore | null>(null);

export function useEvents(): EventsStore {
  const store = useContext(EventsContext);
  if (!store) throw new Error("useEvents must be used inside <EventsProvider>");
  return store;
}
