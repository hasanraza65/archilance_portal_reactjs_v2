import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { loginRequest, logoutRequest, meRequest } from "@/api/auth";
import { setUnauthorizedHandler, readAuthToken, TOKEN_COOKIE, USER_COOKIE } from "@/api/client";
import { isHandoff, clearHandoffParam } from "@/features/versionSwitch/versionPrefs";
import { resolveRole } from "@/lib/roles";

const AuthContext = createContext(null);

const COOKIE_OPTS = { sameSite: "Lax", expires: 14 };

function readPersistedUser() {
  try {
    const raw = Cookies.get(USER_COOKIE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Which token this app should boot with.
 *
 * Normally its own. But when the page load is a deliberate version SWITCH, the
 * classic app's session wins: each app keeps a separate cookie, so a leftover
 * sign-in here would otherwise make you arrive as a different user than the one
 * you switched from — which is exactly what happened when a phone still held an
 * older session from testing.
 */
function bootToken() {
  const classic = Cookies.get("token");
  if (isHandoff() && classic) return { token: classic, adopted: classic !== Cookies.get(TOKEN_COOKIE) };
  return { token: readAuthToken(), adopted: false };
}

export function AuthProvider({ children }) {
  const bootRef = useRef(null);
  if (bootRef.current === null) bootRef.current = bootToken();
  const boot = bootRef.current;
  // On an adopted session the cached user belongs to the OTHER account, so it
  // must not be shown even for a frame — /me repopulates it below.
  const [user, setUser] = useState(() => (boot.adopted ? null : readPersistedUser()));
  const [token, setToken] = useState(boot.token);
  const [booting, setBooting] = useState(true);

  const persist = useCallback((apiUser, accessToken) => {
    const role = resolveRole(apiUser);
    const shaped = {
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role,
      user_role: apiUser.user_role,
      employee_type: apiUser.employee_type ?? null,
      employee_team: apiUser.employee_team ?? null,
      profile_pic: apiUser.profile_pic ?? null,
      is_default_pass: apiUser.is_default_pass ?? 0,
      contract_status: apiUser.contract_status ?? 1,
    };
    Cookies.set(USER_COOKIE, JSON.stringify(shaped), COOKIE_OPTS);
    Cookies.set(TOKEN_COOKIE, accessToken, COOKIE_OPTS);
    setUser(shaped);
    setToken(accessToken);
    return shaped;
  }, []);

  const clear = useCallback(() => {
    Cookies.remove(USER_COOKIE);
    Cookies.remove(TOKEN_COOKIE);
    setUser(null);
    setToken(null);
  }, []);

  const login = useCallback(
    async (loginId, password) => {
      const res = await loginRequest(loginId, password);
      const { access_token, user: apiUser } = res.data;
      if (!access_token || !apiUser) {
        throw new Error("Unexpected response from the server.");
      }
      return persist(apiUser, access_token);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      if (token) await logoutRequest();
    } catch {
      /* best-effort — clear locally regardless */
    }
    clear();
  }, [token, clear]);

  // Validate the persisted session once on boot (silently logs out on 401 via
  // the interceptor below); keeps the optimistic cookie-hydrated user visible
  // in the meantime so there's no boot-time flash of the login screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (token) {
        try {
          const res = await meRequest();
          if (!cancelled && res.data) persist(res.data, token);
        } catch {
          /* interceptor handles 401; other errors just keep the cached user */
        }
      }
      clearHandoffParam();
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-read /me and persist it — used after a change the server owns (e.g. the
   *  forced password change clearing `is_default_pass`). */
  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const res = await meRequest();
    return res.data ? persist(res.data, token) : null;
  }, [token, persist]);

  useEffect(() => {
    setUnauthorizedHandler(() => clear());
  }, [clear]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(user && token), booting, login, logout, refreshUser }),
    [user, token, booting, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
