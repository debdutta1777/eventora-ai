import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventsProvider } from "./events-store";
vi.mock("./auth-context", () => ({
  useAuth: () => ({ ready: false, session: null, error: null }),
}));
afterEach(cleanup);
describe("public page rendering", () => {
  it("renders public content while restoring the session", () => {
    render(
      <EventsProvider publicContent>
        <h1>Plan weddings, birthdays and community events</h1>
      </EventsProvider>,
    );
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.queryByText("Restoring your workspace…")).not.toBeInTheDocument();
  });
  it("keeps account content gated until restoration completes", () => {
    render(
      <EventsProvider>
        <p>Private event</p>
      </EventsProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Restoring your workspace");
    expect(screen.queryByText("Private event")).not.toBeInTheDocument();
  });
});
