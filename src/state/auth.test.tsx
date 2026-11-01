import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider } from "./auth";
import { useAuth } from "./auth-context";
import { AccountControls } from "@/components/account-controls";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  enabled: true,
}));
vi.mock("@/lib/cloud/client", () => ({
  cloudConfigured: true,
  getCloudClient: () => (mocks.enabled ? { auth: mocks } : null),
}));
vi.mock("./events-context", () => ({
  useEvents: () => ({
    mode: "demo",
    ready: true,
    accountError: null,
    hasUnsavedChanges: false,
    reloadAccount: vi.fn(),
    importLocalDrafts: vi.fn(),
  }),
}));
let notify: (event: string, session: Session | null) => void;
const session = { user: { id: "alice", email: "alice@example.invalid" } } as Session;
function Probe() {
  const auth = useAuth();
  return (
    <p role="status">
      {!auth.ready ? "Loading" : (auth.error ?? auth.session?.user.id ?? "Signed out")}
    </p>
  );
}
beforeEach(() => {
  mocks.enabled = true;
  for (const value of Object.values(mocks))
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockImplementation((callback) => {
    notify = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("auth lifecycle", () => {
  it("restores a session and unsubscribes on unmount", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("alice");
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
  it("does not overwrite a newer auth event with an older session read", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getSession.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => notify("SIGNED_IN", session));
    await act(async () => {
      resolve({ data: { session: null }, error: null });
    });
    expect(screen.getByRole("status")).toHaveTextContent("alice");
    act(() => notify("SIGNED_OUT", null));
    expect(screen.getByRole("status")).toHaveTextContent("Signed out");
  });
  it("reports session restoration failure", async () => {
    mocks.getSession.mockRejectedValue(new Error("Network failed"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText(/Could not restore/);
  });
});
describe("account forms", () => {
  it("shows sign-in failures and permits retry", async () => {
    mocks.signInWithPassword
      .mockResolvedValueOnce({ data: { session: null }, error: new Error("Invalid credentials") })
      .mockResolvedValueOnce({ data: { session }, error: null });
    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await screen.findByRole("button", { name: "Sign in / Register" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in / Register" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alice@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-only-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(2);
  });
  it("explains email confirmation after registration", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await screen.findByRole("button", { name: "Sign in / Register" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in / Register" }));
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alice@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-only-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await screen.findByText(/check your inbox/);
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "alice@example.invalid",
      password: "test-only-password",
    });
  });
  it("disables sign-in when configuration is absent", async () => {
    mocks.enabled = false;
    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await screen.findByRole("button", { name: "Sign in / Register" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in / Register" }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByText(/not configured/)).toBeInTheDocument();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it("signs out on this device without revoking unrelated sessions", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await screen.findByRole("button", { name: "My account" });
    fireEvent.click(screen.getByRole("button", { name: "My account" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out on this device" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" }));
  });
});
