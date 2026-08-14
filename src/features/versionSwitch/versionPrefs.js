/**
 * Shared contract between the CLASSIC app (served at "/") and the NEW app
 * (served at "/v2/").
 *
 * They are two separate builds on the same origin, so this file is duplicated
 * byte-for-byte in both. Keep them identical — the keys below are the only
 * thing the two apps agree on.
 *
 * Why two builds instead of one: both define `--color-primary-*` in their own
 * Tailwind `@theme` with different values. A single build merges the blocks and
 * one palette silently overwrites the other, breaking that design. Separate
 * bundles guarantee the classic app is untouched.
 */

import Cookies from "js-cookie";

export const CLASSIC_BASE = "/";
export const V2_BASE = "/v2";

/** localStorage keys (per browser, survive logout). */
const KEY_CHOICE = "archilance.uiVersion";        // "classic" | "v2"
const KEY_SEEN_CHOOSER = "archilance.uiChooserSeen";
const KEY_SEEN_TOUR = "archilance.uiTourSeen";

/**
 * Roles allowed to switch versions. Widen this list to roll the new UI out
 * further - nothing else needs changing, and every entry point (the first-run
 * chooser, the header button, and the sticky preference) reads from here.
 */
const SWITCH_ROLES = [
  "admin", "employee", "manager", "outsource", "supervisor", "executive",
  "internee", "customer", "member",
];

export function canUseVersionSwitch(role) {
  return SWITCH_ROLES.includes(String(role || "").toLowerCase());
}

export function getVersionChoice() {
  try {
    const v = localStorage.getItem(KEY_CHOICE);
    return v === "v2" || v === "classic" ? v : null;
  } catch {
    return null;
  }
}

export function setVersionChoice(v) {
  try {
    localStorage.setItem(KEY_CHOICE, v);
    localStorage.setItem(KEY_SEEN_CHOOSER, "1");
  } catch {
    /* private mode — the switch still works for this session */
  }
}

export function hasSeenChooser() {
  try {
    return localStorage.getItem(KEY_SEEN_CHOOSER) === "1";
  } catch {
    return true; // never nag if storage is unavailable
  }
}

export function markChooserSeen() {
  try {
    localStorage.setItem(KEY_SEEN_CHOOSER, "1");
  } catch { /* ignore */ }
}

export function hasSeenTour() {
  try {
    return localStorage.getItem(KEY_SEEN_TOUR) === "1";
  } catch {
    return true;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(KEY_SEEN_TOUR, "1");
  } catch { /* ignore */ }
}

/**
 * Is the user signed in *right now*, from either app's cookies?
 *
 * The classic app stores `token`; the new one stores `v2_token`. Either means
 * a live session, because both are Bearer tokens for the same backend.
 */
export function hasSession() {
  return Boolean(Cookies.get("token") || Cookies.get("v2_token"));
}

/** Reads the signed-in role from whichever app last wrote its cookie. */
export function readRole() {
  try {
    const classic = Cookies.get("user");
    if (classic) {
      const parsed = JSON.parse(classic);
      if (parsed?.role) return parsed.role;
    }
  } catch { /* fall through */ }
  try {
    const next = Cookies.get("v2_user");
    if (next) {
      const parsed = JSON.parse(next);
      if (parsed?.role) return parsed.role;
    }
  } catch { /* fall through */ }
  return Cookies.get("userRole") || null;
}

/** Absolute URL for a path inside the other app, preserving query + hash. */
export function buildUrl(base, path) {
  const clean = `/${String(path || "").replace(/^\/+/, "")}`;
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${window.location.origin}${prefix}${clean === "/" ? "/" : clean}`;
}

/** Marker telling the receiving app "this is a deliberate version switch". */
export const HANDOFF_PARAM = "ui";
export const HANDOFF_VALUE = "switch";

/**
 * URL to hand the user to the other app, carrying the current query string and
 * flagging the navigation as a switch.
 *
 * The flag matters: each app keeps its OWN session cookie, so without it a
 * stale sign-in on the other side wins and you arrive as a different person
 * than the one you just switched from. The receiving app uses this to adopt the
 * sending app's session instead of its own leftover one.
 */
export function switchUrl(base, path) {
  const url = new URL(buildUrl(base, path));
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (k !== HANDOFF_PARAM) url.searchParams.set(k, v);
  });
  url.searchParams.set(HANDOFF_PARAM, HANDOFF_VALUE);
  return url.toString();
}

/** True when the current page load came from a deliberate version switch. */
export function isHandoff() {
  try {
    return new URLSearchParams(window.location.search).get(HANDOFF_PARAM) === HANDOFF_VALUE;
  } catch {
    return false;
  }
}

/** Drops the marker from the address bar once it has been acted on. */
export function clearHandoffParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(HANDOFF_PARAM)) return;
    url.searchParams.delete(HANDOFF_PARAM);
    window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
  } catch { /* ignore */ }
}
