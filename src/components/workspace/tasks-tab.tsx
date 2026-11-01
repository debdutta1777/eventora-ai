import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { DueLabel, TaskStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateSchema } from "@/lib/schemas";
import { TASK_CATEGORIES, type EventRecord, type TaskCategory } from "@/lib/types";
import { useEvents } from "@/state/events-context";

export function TasksTab({ event }: { event: EventRecord }) {
  const { addTask, toggleTask } = useEvents();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [dueDate, setDueDate] = useState(event.brief.date);

  const [error, setError] = useState<{ field: "title" | "date"; message: string } | null>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  const sorted = [...event.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="mt-4 space-y-4">
      <form
        noValidate
        className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) {
            setError({ field: "title", message: "Give this task a name." });
            return;
          }
          if (!dateSchema.safeParse(dueDate).success) {
            setError({ field: "date", message: "Choose a valid task due date." });
            return;
          }
          setError(null);
          addTask(event.id, { title: title.trim(), category, dueDate });
          setTitle("");
        }}
      >
        <div className="min-w-48 flex-1">
          <Label htmlFor="task-title" className="text-xs text-muted-foreground">
            New task
          </Label>
          <Input
            id="task-title"
            aria-invalid={error?.field === "title"}
            aria-describedby={error?.field === "title" ? "task-form-error" : undefined}
            className="mt-1"
            placeholder="Book the DJ"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
        </div>
        <div>
          <Label htmlFor="task-category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger id="task-category" className="mt-1 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="task-due" className="text-xs text-muted-foreground">
            Due date
          </Label>
          <Input
            id="task-due"
            aria-invalid={error?.field === "date"}
            aria-describedby={error?.field === "date" ? "task-form-error" : undefined}
            type="date"
            className="mt-1"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setError(null);
            }}
          />
        </div>
        <Button type="submit">
          <Plus className="size-4" aria-hidden />
          Add task
        </Button>
        {error && (
          <p
            ref={errorSummary}
            id="task-form-error"
            role="alert"
            tabIndex={-1}
            className="w-full text-sm text-destructive"
          >
            {error.message}
          </p>
        )}
      </form>

      <ul className="divide-y rounded-xl border bg-card">
        {sorted.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <label className="flex min-w-0 items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(event.id, task.id)}
                aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
              />
              <span
                className={
                  task.completed
                    ? "min-w-0 [overflow-wrap:anywhere] text-sm text-muted-foreground line-through"
                    : "min-w-0 [overflow-wrap:anywhere] text-sm text-foreground"
                }
              >
                {task.title}
              </span>
              <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                {task.category}
              </span>
            </label>
            <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <DueLabel iso={task.dueDate} />
              <TaskStatusBadge task={task} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
