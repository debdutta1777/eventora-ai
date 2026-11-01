import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { OverviewTab } from "@/components/workspace/overview-tab";
import { BudgetTab } from "@/components/workspace/budget-tab";
import { TasksTab } from "@/components/workspace/tasks-tab";
import { VendorsTab } from "@/components/workspace/vendors-tab";
import { IdeasTab } from "@/components/workspace/ideas-tab";
import { CreateEvent } from "@/components/pages/create-event-page";
import { buildSampleEvents } from "@/lib/demo-data";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/state/events-context", () => ({
  useEvents: () => ({
    ready: true,
    mode: "demo",
    getSaveState: () => "local",
    addExpense: vi.fn(),
    deleteExpense: vi.fn(),
    updateAllocation: vi.fn(),
    updateContingency: vi.fn(),
    toggleTask: vi.fn(),
    addTask: vi.fn(),
    setVendorStatus: vi.fn(),
    toggleVendorDone: vi.fn(),
    toggleIdeaSaved: vi.fn(),
  }),
}));
afterEach(cleanup);

async function audit(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    // jsdom cannot measure rendered colors/layout. Theme contrast has a separate numerical test.
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
      help: v.help,
    })),
  ).toEqual([]);
}

describe("automated accessibility", () => {
  it.each([OverviewTab, BudgetTab, TasksTab, VendorsTab, IdeasTab])(
    "checks the %s workspace structure",
    async (Component) => {
      const event = buildSampleEvents()[0]!;
      const view = render(
        <main>
          <h1>Event workspace</h1>
          <Component event={event} />
        </main>,
      );
      await audit(view.container);
    },
  );
  it("checks the wizard and its invalid-submit error state", async () => {
    const view = render(<CreateEvent />);
    await audit(view.container);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Event name")).toHaveAccessibleDescription(
      /at least 3 characters/,
    );
    await audit(view.container);
  });
  it("announces invalid task input without adding a task", async () => {
    const view = render(
      <main>
        <h1>Tasks</h1>
        <TasksTab event={buildSampleEvents()[0]!} />
      </main>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByLabelText("New task")).toHaveAccessibleDescription("Give this task a name.");
    await audit(view.container);
  });
});
