import type { EventRecord, VendorStatus } from "./types";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats integer paise as INR. Whole rupees render without decimals. */
export function formatINR(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0";
  const rupees = paise / 100;
  const formatter = Number.isInteger(rupees) ? inrFormatter : inrPreciseFormatter;
  return formatter.format(rupees);
}

/** Parses a rupee amount (string or number) into integer paise; NaN when invalid. */
export function rupeesToPaise(input: string | number): number {
  const raw = String(input).trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return Number.NaN;
  const [whole = "0", fraction = ""] = raw.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : Number.NaN;
}

/** Paise → plain rupee string for form inputs. */
export function paiseToRupeeInput(paise: number): string {
  return (paise / 100).toString();
}

/** "2026-03-14" → "14 Mar 2026". */
export function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][m - 1];
  return `${d} ${month} ${y}`;
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return Number.NaN;
  const [y = 0, m = 0, d = 0] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  if (!Number.isFinite(target.getTime()) || target.toISOString().slice(0, 10) !== iso)
    return Number.NaN;
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (target.getTime() - start) / 86_400_000;
}

export interface BudgetTotals {
  totalBudgetPaise: number;
  allocatedPaise: number;
  contingencyPaise: number;
  spentPaise: number;
  remainingPaise: number;
  overspentPaise: number;
}

export function computeBudgetTotals(event: EventRecord): BudgetTotals {
  const totalBudgetPaise = event.brief.totalBudgetPaise;
  const spentPaise = event.budget.categories.reduce(
    (sum, cat) => sum + cat.expenses.reduce((s, e) => s + e.amountPaise, 0),
    0,
  );
  const contingencyPaise = event.budget.contingencyPaise;
  const categoryAllocated = event.budget.categories.reduce((s, c) => s + c.allocatedPaise, 0);
  const allocatedPaise = categoryAllocated + contingencyPaise;
  const remainingPaise = totalBudgetPaise - spentPaise;
  return {
    totalBudgetPaise,
    allocatedPaise,
    contingencyPaise,
    spentPaise,
    remainingPaise,
    overspentPaise: Math.max(0, spentPaise - totalBudgetPaise),
  };
}

export function taskState(task: {
  dueDate: string;
  completed: boolean;
}): "done" | "overdue" | "due-soon" | "upcoming" {
  if (task.completed) return "done";
  const days = daysUntil(task.dueDate);
  if (days < 0) return "overdue";
  if (days <= 7) return "due-soon";
  return "upcoming";
}

export const VENDOR_STATUS_ORDER: VendorStatus[] = [
  "needed",
  "researching",
  "contacted",
  "confirmed",
];
