import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthSession } from "./storage";
import { clearSession, readSession, writeSession } from "./storage";
import * as client from "./client";

type AuthValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readSession(),
  );

  useEffect(() => {
    const sync = () => setSession(readSession());
    window.addEventListener("impronta:auth-session", sync);
    return () => window.removeEventListener("impronta:auth-session", sync);
  }, []);

  const value = useMemo<AuthValue>(() => {
    return {
      session,
      isAuthenticated: !!session,
      login: async (email, password) => {
        const s = await client.login(email, password);
        setSession(s);
        writeSession(s);
      },
      logout: async () => {
        const s = session;
        setSession(null);
        clearSession();
        if (s) await client.logout(s.accessToken);
      },
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider mancante");
  return ctx;
}
