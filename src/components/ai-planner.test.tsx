import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { AIPlanner } from "./ai-planner";
import { aiEvent, aiFixture, runFixture } from "@/test/ai-fixtures";
import { materializeAIPlan } from "@/lib/ai/plan";
const mocks = vi.hoisted(() => ({
  mode: "account",
  request: vi.fn(),
  read: vi.fn(),
  list: vi.fn(),
  apply: vi.fn(),
  accept: vi.fn(),
}));
vi.mock("@/lib/ai/client", () => ({
  requestAIPlan: mocks.request,
  readAIPlan: mocks.read,
  listAIPlans: mocks.list,
  applyAIPlan: mocks.apply,
}));
vi.mock("@/state/events-context", () => ({
  useEvents: () => ({
    mode: mocks.mode,
    getSaveState: () => "saved",
    getRevision: () => 1,
    acceptAIResult: mocks.accept,
  }),
}));
beforeEach(() => {
  mocks.mode = "account";
  for (const value of Object.values(mocks))
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  mocks.list.mockResolvedValue([]);
  mocks.accept.mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const prepared = () => {
  const event = aiEvent();
  const proposal = aiFixture(event);
  const run = {
    ...runFixture(event),
    status: "ready" as const,
    proposal,
    proposed_record: materializeAIPlan(event, proposal, runFixture(event).id, "test-model"),
  };
  return { event, run };
};
describe("proposal review UI", () => {
  it("shows all four sections and only applies after explicit review", async () => {
    const { event, run } = prepared();
    mocks.request.mockResolvedValue(run);
    mocks.apply.mockResolvedValue({ record: run.proposed_record, revision: 2 });
    render(<AIPlanner event={event} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    await screen.findByRole("region", { name: "AI proposal review" });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Additional preparation tasks")).toBeInTheDocument();
    expect(screen.getByText("Additional vendor checklists")).toBeInTheDocument();
    expect(screen.getByText("Personalized ideas")).toBeInTheDocument();
    expect(mocks.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply proposal" }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalled());
    expect(screen.getByText(/applied and saved/)).toBeInTheDocument();
  });
  it("disables application when the current event changed", async () => {
    const { event, run } = prepared();
    mocks.request.mockResolvedValue(run);
    const view = render(<AIPlanner event={event} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    await screen.findByRole("button", { name: "Apply proposal" });
    view.rerender(<AIPlanner event={{ ...event, brief: { ...event.brief, guestCount: 51 } }} />);
    expect(screen.getByRole("button", { name: "Apply proposal" })).toBeDisabled();
    expect(screen.getByText(/event changed after this proposal/)).toBeInTheDocument();
  });
  it("shows an honest failure without generating a fake plan", async () => {
    mocks.request.mockRejectedValue(new Error("AI planning isn't available yet."));
    render(<AIPlanner event={aiEvent()} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("isn't available");
    expect(screen.queryByRole("button", { name: "Apply proposal" })).not.toBeInTheDocument();
  });
  it("keeps signed-out users in the template demo without background calls", () => {
    mocks.mode = "demo";
    render(<AIPlanner event={aiEvent()} />);
    expect(screen.getByRole("button", { name: "Generate AI proposal" })).toBeDisabled();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("polls a persisted generating job until the proposal is ready", async () => {
    vi.useFakeTimers();
    const { event, run } = prepared();
    mocks.request.mockResolvedValue({
      ...run,
      status: "generating",
      proposal: null,
      proposed_record: null,
    });
    mocks.read.mockResolvedValue(run);
    render(<AIPlanner event={event} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole("button", { name: "Apply proposal" })).toBeInTheDocument();
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
  it("bounds polling even when every status response is a new generating object", async () => {
    vi.useFakeTimers();
    const { event, run } = prepared();
    const generating = { ...run, status: "generating", proposal: null, proposed_record: null };
    mocks.request.mockResolvedValue(generating);
    mocks.read.mockImplementation(async () => ({ ...generating }));
    render(<AIPlanner event={event} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    });
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.read).toHaveBeenCalledTimes(60);
    expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.read).toHaveBeenCalledTimes(60);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("cancels pending polling when the workspace unmounts", async () => {
    vi.useFakeTimers();
    const { event, run } = prepared();
    mocks.request.mockResolvedValue({
      ...run,
      status: "generating",
      proposal: null,
      proposed_record: null,
    });
    const view = render(<AIPlanner event={event} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate AI proposal" }));
    });
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
