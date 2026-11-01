import type { ReactNode } from "react";

import { daysUntil, taskState } from "@/lib/format";
import { VENDOR_STATUS_LABELS, type Task, type VendorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "lavender" | "forest";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
  lavender: "bg-lavender text-lavender-foreground",
  forest: "bg-secondary text-secondary-foreground",
};

/** Text-first status badge — color supports it, text carries the meaning. */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TaskStatusBadge({ task }: { task: Pick<Task, "dueDate" | "completed"> }) {
  const state = taskState(task);
  switch (state) {
    case "done":
      return <StatusBadge tone="success">Done</StatusBadge>;
    case "overdue":
      return <StatusBadge tone="danger">Overdue</StatusBadge>;
    case "due-soon":
      return <StatusBadge tone="warning">Due soon</StatusBadge>;
    default:
      return <StatusBadge>Upcoming</StatusBadge>;
  }
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const tone: Tone =
    status === "confirmed"
      ? "success"
      : status === "contacted"
        ? "forest"
        : status === "researching"
          ? "lavender"
          : "neutral";
  return <StatusBadge tone={tone}>{VENDOR_STATUS_LABELS[status]}</StatusBadge>;
}

export function DueLabel({ iso }: { iso: string }) {
  const days = daysUntil(iso);
  if (Number.isNaN(days)) return null;
  if (days === 0) return <span>Due today</span>;
  if (days === 1) return <span>Due tomorrow</span>;
  if (days < 0) return <span>{-days} days overdue</span>;
  return <span>In {days} days</span>;
}
