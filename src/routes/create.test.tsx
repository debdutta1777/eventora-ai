import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateEvent } from "@/components/pages/create-event-page";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), create: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/state/events-context", () => ({
  useEvents: () => ({ ready: true, createEvent: mocks.create }),
}));
beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.create.mockReset().mockReturnValue({ id: "synthetic-event" });
});
afterEach(cleanup);
const basics = () => {
  fireEvent.click(screen.getByRole("button", { name: /Birthday/ }));
  fireEvent.change(screen.getByLabelText("Event name"), {
    target: { value: "Synthetic birthday" },
  });
  fireEvent.change(screen.getByLabelText("Date", { exact: true }), {
    target: { value: "2099-01-01" },
  });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Guest count"), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText("Total budget (₹)"), { target: { value: "123.45" } });
};
describe("wizard keyboard and review flow", () => {
  it("focuses the error summary when a submitted step is invalid", () => {
    render(<CreateEvent />);
    fireEvent.submit(screen.getByRole("button", { name: "Next" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("at least 3 characters");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("focuses each step heading, retains inputs on Back and clears obsolete errors", () => {
    render(<CreateEvent />);
    basics();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Preferences" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "The basics" })).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Total budget (₹)")).toHaveValue("123.45");
  });
  it("shows reconciled fractional amounts in review and creates only on final submit", () => {
    render(<CreateEvent />);
    basics();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Review & create" })).toHaveFocus();
    const list = screen.getByRole("list", { name: "Starter budget allocations" });
    expect(within(list).getByText("Food & cake").closest("li")).toHaveTextContent("₹30.85");
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("button", { name: "Create event" }).closest("form")!);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalBudgetPaise: 12345, type: "birthday", guestCount: 20 }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/events/$eventId",
      params: { eventId: "synthetic-event" },
    });
  });
});
