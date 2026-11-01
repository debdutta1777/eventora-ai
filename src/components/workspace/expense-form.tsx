import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupeesToPaise } from "@/lib/format";

interface ExpenseFormProps {
  idPrefix: string;
  onAdd: (label: string, amountPaise: number) => void;
}

export function ExpenseForm({ idPrefix, onAdd }: ExpenseFormProps) {
  const [label, setLabel] = useState("");
  const [rupees, setRupees] = useState("");
  const [error, setError] = useState<{ field: "label" | "amount"; message: string } | null>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  const errorId = `expense-error-${idPrefix}`;
  useEffect(() => {
    if (error) summary.current?.focus();
  }, [error]);

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) {
          setError({ field: "label", message: "Give this expense a name." });
          return;
        }
        const amount = rupeesToPaise(rupees);
        if (!Number.isSafeInteger(amount) || amount <= 0) {
          setError({
            field: "amount",
            message: "Enter an amount greater than zero, with at most two decimal places.",
          });
          return;
        }
        onAdd(label.trim(), amount);
        setLabel("");
        setRupees("");
        setError(null);
      }}
    >
      <div className="min-w-40 flex-1">
        <Label htmlFor={`expense-label-${idPrefix}`} className="text-xs text-muted-foreground">
          Expense
        </Label>
        <Input
          id={`expense-label-${idPrefix}`}
          className="mt-1"
          placeholder="Menu tasting"
          value={label}
          aria-invalid={error?.field === "label"}
          aria-describedby={error?.field === "label" ? errorId : undefined}
          onChange={(e) => {
            setLabel(e.target.value);
            setError(null);
          }}
        />
      </div>
      <div>
        <Label htmlFor={`expense-amount-${idPrefix}`} className="text-xs text-muted-foreground">
          Amount (₹)
        </Label>
        <Input
          id={`expense-amount-${idPrefix}`}
          inputMode="decimal"
          className="mt-1 w-32 tabular-nums"
          placeholder="5000"
          value={rupees}
          aria-invalid={error?.field === "amount"}
          aria-describedby={error?.field === "amount" ? errorId : undefined}
          onChange={(e) => {
            setRupees(e.target.value);
            setError(null);
          }}
        />
      </div>
      <Button type="submit" size="sm" variant="outline">
        <Plus className="size-4" aria-hidden />
        Add
      </Button>
      {error && (
        <p
          ref={summary}
          id={errorId}
          role="alert"
          tabIndex={-1}
          className="w-full text-sm text-destructive"
        >
          {error.message}
        </p>
      )}
    </form>
  );
}
