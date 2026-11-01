export type EventType = "wedding" | "birthday" | "community";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

export const TASK_CATEGORIES = [
  "Venue",
  "Food",
  "Decor",
  "Guests",
  "Program",
  "Logistics",
  "Finance",
  "Publicity",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const VENDOR_STATUSES = ["needed", "researching", "contacted", "confirmed"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  needed: "Needed",
  researching: "Researching",
  contacted: "Contacted",
  confirmed: "Confirmed",
};

export interface Expense {
  id: string;
  label: string;
  /** Money is always stored as integer paise. */
  amountPaise: number;
}

export interface BudgetCategory {
  /** Preserve this exact allocation during deterministic or AI replanning. */
  locked?: boolean | undefined;
  id: string;
  name: string;
  allocatedPaise: number;
  expenses: Expense[];
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  /** ISO date, yyyy-MM-dd. */
  dueDate: string;
  completed: boolean;
}

export interface VendorItem {
  id: string;
  title: string;
  /** Sample guidance for what to check — never a fabricated business. */
  note: string;
  status: VendorStatus;
  done: boolean;
}

export interface VendorGroup {
  id: string;
  name: string;
  items: VendorItem[];
}

export interface Idea {
  id: string;
  title: string;
  explanation: string;
  costRangeLabel: string;
  steps: string[];
  saved: boolean;
}

export interface EventBrief {
  name: string;
  type: EventType;
  /** ISO date, yyyy-MM-dd. */
  date: string;
  city: string;
  guestCount: number;
  totalBudgetPaise: number;
  priorities: string[];
  theme: string;
  foodPreference: string;
  accessibility: string;
  notes: string;
}

export interface EventBudget {
  categories: BudgetCategory[];
  contingencyPaise: number;
  contingencyLabel: string;
}

export interface AIPlanMetadata {
  needsRefresh?: boolean | undefined;
  runId: string;
  provider: "gemini";
  model: string;
  promptVersion: string;
  generatedAt: string;
  summary: string;
  assumptions: string[];
  warnings: string[];
}

export interface EventRecord {
  aiPlan?: AIPlanMetadata | undefined;
  id: string;
  brief: EventBrief;
  budget: EventBudget;
  tasks: Task[];
  vendorGroups: VendorGroup[];
  ideas: Idea[];
  createdAt: string;
  updatedAt: string;
  isSample: boolean;
  /** Sample events re-anchor to `today + offsetDays` when their date passes. */
  sampleOffsetDays?: number | undefined;
}

export const PLANNING_PRIORITIES = [
  "Food",
  "Decor",
  "Photography",
  "Music",
  "Venue",
  "Guest comfort",
  "Entertainment",
  "Budget discipline",
] as const;
