import { useState } from "react";
import { useAuth } from "@/state/auth";
import { useEvents } from "@/state/events-store";
import { getCloudClient } from "@/lib/cloud/client";
import { loadStoredEvents } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AccountControls() {
  const { session, configured } = useAuth();
  const { mode, ready, accountError, reloadAccount, importLocalDrafts, hasUnsavedChanges } =
    useEvents();
  const [open, setOpen] = useState(false);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const signOut = async () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved account edits. Sign out and discard those edits? Saved events and browser demo drafts will remain.",
      )
    )
      return;
    const client = getCloudClient();
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) setError(error.message);
      else setOpen(false);
    } catch {
      setError("Could not sign out. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mb-5 space-y-2 border-b pb-4" aria-label="Workspace account">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {mode === "account" ? "Private account workspace" : "Browser demo workspace"}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "account"
              ? "Save each event to account after editing. Unsaved changes stay in memory."
              : "Template plans stay on this device. Sign in to save private events across devices."}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            setError("");
            setMessage("");
            setPassword("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {session ? "My account" : "Sign in / Register"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {session ? "Your account" : signup ? "Create an account" : "Sign in to Eventora"}
              </DialogTitle>
              <DialogDescription>
                {configured
                  ? "Your event plans are private to your account. Browser drafts are imported only when you choose."
                  : "Account storage is not configured for this preview. The browser demo still works; see the Supabase setup guide."}
              </DialogDescription>
            </DialogHeader>
            {session ? (
              <div className="space-y-3">
                <p className="break-all text-sm">{session.user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {hasUnsavedChanges
                    ? "You have unsaved account changes."
                    : "All current account events are saved."}
                </p>
                <Button disabled={busy} variant="outline" onClick={() => void signOut()}>
                  Sign out on this device
                </Button>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const client = getCloudClient();
                  if (!client) return;
                  setBusy(true);
                  setMessage("");
                  setError("");
                  try {
                    const result = signup
                      ? await client.auth.signUp({ email: email.trim(), password })
                      : await client.auth.signInWithPassword({ email: email.trim(), password });
                    if (result.error) throw result.error;
                    setPassword("");
                    if (result.data.session) setOpen(false);
                    else
                      setMessage(
                        "If registration is available for this email, check your inbox to confirm your account, then sign in.",
                      );
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Authentication failed. Please retry.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="account-password">Password</Label>
                  <Input
                    id="account-password"
                    type="password"
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!configured || busy} type="submit">
                    {busy ? "Please wait…" : signup ? "Register" : "Sign in"}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSignup(!signup);
                      setError("");
                      setMessage("");
                    }}
                  >
                    {signup ? "Already registered? Sign in" : "Create an account"}
                  </Button>
                </div>
              </form>
            )}
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {mode === "account" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!ready}
            onClick={() => {
              const drafts = (loadStoredEvents() ?? []).filter((event) => !event.isSample);
              if (!drafts.length) {
                setMessage("There are no local drafts to import.");
                return;
              }
              if (
                !window.confirm(
                  `Import up to ${drafts.length} local draft(s) into this workspace? Existing account events will not be replaced. Each imported draft needs Save to account before upload.`,
                )
              )
                return;
              importLocalDrafts();
              setMessage(
                "Local drafts added to the workspace. Open each event and Save to account to upload it.",
              );
            }}
          >
            Import local drafts
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!ready}
            onClick={() => {
              if (
                hasUnsavedChanges &&
                !window.confirm("Reload saved account events and discard unsaved changes?")
              )
                return;
              void reloadAccount();
            }}
          >
            Reload account events
          </Button>
        </div>
      )}
      {!open && message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {accountError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
        >
          {accountError}
        </p>
      )}
    </section>
  );
}
