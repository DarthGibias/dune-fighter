import { createContext, useContext } from "react";

export interface AuthState {
  /** Clerk loaded (backend reachable). false = offline / guest-only. */
  available: boolean;
  signedIn: boolean;
  userId: string | null;
  name: string | null;
}

export const OFFLINE_AUTH: AuthState = { available: false, signedIn: false, userId: null, name: null };
export const AuthContext = createContext<AuthState>(OFFLINE_AUTH);
export const useAuthState = () => useContext(AuthContext);
