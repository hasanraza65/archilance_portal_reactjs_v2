import axios from "axios";
import Cookies from "js-cookie";

// Namespaced so this app can run side-by-side with the v1 portal on
// localhost without clobbering its cookies (cookies are shared across ports
// on the same hostname, only v1 uses "token"/"user"/"userRole").
export const TOKEN_COOKIE = "v2_token";
export const USER_COOKIE = "v2_user";
export const ROLE_COOKIE = "v2_role";

export const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: "application/json" },
});

/**
 * Live bearer token.
 *
 * Falls back to the CLASSIC app's `token` cookie so that switching versions
 * doesn't dump you at the login screen: both apps talk to the same backend with
 * the same Sanctum token, and cookies are shared across the origin. Reading it
 * is enough — we never write to the classic app's cookies, so its session can't
 * be disturbed by anything that happens here.
 */
export function readAuthToken() {
  return Cookies.get(TOKEN_COOKIE) || Cookies.get("token") || null;
}

apiClient.interceptors.request.use((config) => {
  const token = readAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Convenience: unwrap axios's `{data}` envelope, throw a friendly message otherwise. */
export function extractErrorMessage(err, fallback = "Something went wrong.") {
  return err?.response?.data?.message || err?.message || fallback;
}
