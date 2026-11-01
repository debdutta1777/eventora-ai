import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./auth-context";
import { cloudConfigured, getCloudClient } from "@/lib/cloud/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    session: null,
    error: null,
    configured: cloudConfigured,
  });
  useEffect(() => {
    const client = getCloudClient();
    if (!client) {
      setState({ ready: true, session: null, error: null, configured: false });
      return;
    }
    let active = true;
    let receivedAuthEvent = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      // Synchronous callback: never await another Supabase call inside its auth lock.
      receivedAuthEvent = true;
      if (active) setState({ ready: true, session, error: null, configured: true });
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !receivedAuthEvent)
          setState({
            ready: true,
            session: data.session,
            error: error?.message ?? null,
            configured: true,
          });
      })
      .catch(() => {
        if (active && !receivedAuthEvent)
          setState({
            ready: true,
            session: null,
            error: "Could not restore your session. Reload to retry.",
            configured: true,
          });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
