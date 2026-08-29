"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  getToken,
  setToken,
  type AuthUser,
  type Organization,
} from "@/lib/api";

type Status = "loading" | "authed" | "anon";

interface AuthState {
  status: Status;
  user: AuthUser | null;
  organization: Organization | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // On mount, validate any stored token against the API.
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!getToken()) {
        if (active) setStatus("anon");
        return;
      }
      try {
        const me = await api.me();
        if (!active) return;
        setUser(me.user);
        setOrganization(me.organization);
        setStatus("authed");
      } catch {
        if (!active) return;
        setToken(null);
        setStatus("anon");
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    setOrganization(res.organization);
    setStatus("authed");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* best-effort — the token is discarded regardless */
    }
    setToken(null);
    setUser(null);
    setOrganization(null);
    setStatus("anon");
  }, []);

  const value = useMemo(
    () => ({ status, user, organization, login, logout }),
    [status, user, organization, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
