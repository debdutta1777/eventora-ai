import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthState {
  ready: boolean;
  session: Session | null;
  error: string | null;
  configured: boolean;
}
export const AuthContext = createContext<AuthState>({
  ready: true,
  session: null,
  error: null,
  configured: false,
});
export const useAuth = () => useContext(AuthContext);
