import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "./expense-form";

afterEach(cleanup);

describe("expense entry", () => {
  it("explains an empty label and focuses the associated error", () => {
    const add = vi.fn();
    render(<ExpenseForm idPrefix="food" onAdd={add} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByLabelText("Expense")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Expense")).toHaveAccessibleDescription(
      "Give this expense a name.",
    );
    expect(add).not.toHaveBeenCalled();
  });

  it.each(["", "0", "-1", "12.345", "not money", "9007199254740992"])(
    "rejects invalid expense amount %j without saving it",
    (amount) => {
      const add = vi.fn();
      render(<ExpenseForm idPrefix="food" onAdd={add} />);
      fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "Cake advance" } });
      fireEvent.change(screen.getByLabelText("Amount (₹)"), { target: { value: amount } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      expect(screen.getByRole("alert")).toHaveFocus();
      expect(screen.getByLabelText("Amount (₹)")).toHaveAttribute("aria-invalid", "true");
      expect(add).not.toHaveBeenCalled();
    },
  );

  it("recovers from an error and commits trimmed labels with exact integer paise", () => {
    const add = vi.fn();
    render(<ExpenseForm idPrefix="food" onAdd={add} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: " Cake advance " } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Amount (₹)"), { target: { value: "123.45" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(add).toHaveBeenCalledExactlyOnceWith("Cake advance", 12345);
    expect(screen.getByLabelText("Expense")).toHaveValue("");
    expect(screen.getByLabelText("Amount (₹)")).toHaveValue("");
  });
});
