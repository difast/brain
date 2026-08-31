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
  type LoginStartResponse,
  type Organization,
} from "@/lib/api";

type Status = "loading" | "authed" | "anon";

interface AuthState {
  status: Status;
  user: AuthUser | null;
  organization: Organization | null;
  /** Password step. Returns the challenge when a mailed code is required. */
  login: (
    email: string,
    password: string,
    captchaToken?: string | null,
  ) => Promise<LoginStartResponse>;
  /** Code step: finishes a login that returned `code_required`. */
  completeLogin: (challenge: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

  const login = useCallback(
    async (email: string, password: string, captchaToken?: string | null) => {
      const res = await api.login(email, password, captchaToken);
      // With email confirmation on, the session only starts after the code
      // step — here we just hand the challenge back to the login page.
      if (!res.code_required && res.token && res.user && res.organization) {
        setToken(res.token);
        setUser(res.user);
        setOrganization(res.organization);
        setStatus("authed");
      }
      return res;
    },
    [],
  );

  const completeLogin = useCallback(async (challenge: string, code: string) => {
    const res = await api.loginVerify(challenge, code);
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

  // Re-fetch the current user (e.g. after changing email or avatar) without a
  // full page reload. The session token itself carries no email/avatar, so it
  // stays valid across either change.
  const refreshUser = useCallback(async () => {
    const me = await api.me();
    setUser(me.user);
    setOrganization(me.organization);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      organization,
      login,
      completeLogin,
      logout,
      refreshUser,
    }),
    [status, user, organization, login, completeLogin, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
