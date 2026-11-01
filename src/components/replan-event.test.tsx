import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { ReplanEvent } from "./replan-event";
import { aiEvent } from "@/test/ai-fixtures";
const mocks = vi.hoisted(() => ({ apply: vi.fn(), saving: false }));
vi.mock("@/state/events-store", () => ({
  useEvents: () => ({
    applyReplan: mocks.apply,
    mode: "account",
    getSaveState: () => (mocks.saving ? "saving" : "saved"),
  }),
}));
beforeEach(() => {
  mocks.apply.mockReset().mockReturnValue(true);
  mocks.saving = false;
});
afterEach(cleanup);
const preview = () => {
  fireEvent.change(screen.getByLabelText("New total budget (₹)"), {
    target: { value: "90000.13" },
  });
  fireEvent.change(screen.getByLabelText("New guest count"), { target: { value: "75" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview changes" }));
};
describe("replanning review flow", () => {
  it("previews without mutation then applies explicitly with locks and save guidance", () => {
    const e = aiEvent();
    render(<ReplanEvent event={e} />);
    fireEvent.click(screen.getByLabelText(/Lock Venue/));
    preview();
    expect(screen.getByRole("region", { name: "Replanning preview" })).toBeInTheDocument();
    expect(mocks.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    expect(mocks.apply.mock.calls[0]![0].brief.guestCount).toBe(75);
    expect(mocks.apply.mock.calls[0]![0].budget.categories[0].locked).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Save to account");
  });
  it("rejects infeasible input and discards a preview without applying", () => {
    render(<ReplanEvent event={aiEvent()} />);
    fireEvent.click(screen.getByLabelText(/Lock Venue/));
    fireEvent.change(screen.getByLabelText("New total budget (₹)"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview changes" }));
    expect(screen.getByRole("alert")).toHaveTextContent("cannot cover");
    preview();
    fireEvent.click(screen.getByRole("button", { name: "Cancel preview" }));
    expect(screen.queryByRole("region", { name: "Replanning preview" })).not.toBeInTheDocument();
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it("blocks stale previews and clears preview after changing form inputs", () => {
    const e = aiEvent();
    const view = render(<ReplanEvent event={e} />);
    preview();
    view.rerender(<ReplanEvent event={{ ...e, updatedAt: "2030-01-01T00:00:00.000Z" }} />);
    expect(screen.getByRole("button", { name: "Apply changes" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("event changed");
    fireEvent.change(screen.getByLabelText("New guest count"), { target: { value: "80" } });
    expect(screen.queryByRole("region", { name: "Replanning preview" })).not.toBeInTheDocument();
  });
});
