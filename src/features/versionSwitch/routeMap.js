/**
 * Route translation between the CLASSIC app ("/") and the NEW app ("/v2/").
 *
 * Duplicated byte-for-byte in both builds — keep them identical.
 *
 * The point: switching versions while you're deep in a job or a task should
 * land you on the SAME record, not dump you on a dashboard. Where a screen has
 * no counterpart the rule falls back to the closest parent (a brief has no
 * standalone page in v2, so it degrades to that job), never to "/".
 */

/* Ordered longest/most-specific first — the first pattern that matches wins. */

const CLASSIC_TO_V2 = [
  // Jobs, tasks, boards
  [/^\/project\/(\d+)\/?$/i, (m) => `/jobs/task/${m[1]}`],
  [/^\/job\/(\d+)\/kanban\/?$/i, (m) => `/jobs/${m[1]}`],
  [/^\/kanban\/(\d+)\/?$/i, (m) => `/jobs/${m[1]}`],
  [/^\/job-brief\/(\d+)\/?$/i, () => `/jobs`],
  [/^\/work-diary\/(\d+)\/?$/i, (m) => `/jobs/${m[1]}/work-diary`],
  [/^\/jobs\/(\d+)\/?$/i, (m) => `/jobs/${m[1]}`],
  [/^\/jobs\/?$/i, () => `/jobs`],

  // People
  [/^\/employees\/work-sessions\/(\d+)\/?$/i, (m) => `/work-diary/${m[1]}`],
  [/^\/employees\/work-hours\/(\d+)\/?$/i, (m) => `/employees/${m[1]}/work-hours`],
  [/^\/employees\/view\/(\d+)\/?$/i, (m) => `/employees/${m[1]}`],
  [/^\/employees\/edit\/(\d+)\/?$/i, (m) => `/employees/${m[1]}/edit`],
  [/^\/employees\/add\/?$/i, () => `/employees/new`],
  [/^\/employees\/?$/i, () => `/employees`],

  [/^\/customers\/view\/(\d+)\/?$/i, (m) => `/customers/${m[1]}`],
  [/^\/customers\/edit\/(\d+)\/?$/i, (m) => `/customers/${m[1]}`],
  [/^\/customers\/add\/?$/i, () => `/customers`],
  [/^\/customers\/?$/i, () => `/customers`],
  [/^\/customerteam\/?$/i, () => `/customer-teams`],

  // Time & leave
  [/^\/work-session\/?$/i, () => `/work-diary`],
  [/^\/employeeleaves\/?$/i, () => `/my-leaves`],
  [/^\/leaves\/?$/i, () => `/leaves`],
  [/^\/my-grading\/?$/i, () => `/my-grading`],

  // Misc
  [/^\/application\/?$/i, () => `/download`],
  [/^\/notification-settings\/?$/i, () => `/notification-settings`],
  [/^\/notifications\/?$/i, () => `/notifications`],
  [/^\/profile(\/edit)?\/?$/i, () => `/profile`],
  [/^\/subscriptions?\/?$/i, () => `/subscriptions`],
  [/^\/contracts\/templates\/(\d+)\/edit\/?$/i, (m) => `/contracts/templates/${m[1]}/edit`],
  [/^\/contracts\/templates\/new\/?$/i, () => `/contracts/templates/new`],
  [/^\/contracts\/send\/?$/i, () => `/contracts/send`],
  [/^\/contracts\/?$/i, () => `/contracts`],
  [/^\/chat\/?$/i, () => `/chat`],
  [/^\/team\/?$/i, () => `/team`],
  [/^\/teamaccess\/?$/i, () => `/teamaccess`],
  [/^\/dashboard\/?$/i, () => `/dashboard`],
];

const V2_TO_CLASSIC = [
  [/^\/jobs\/task\/(\d+)\/?$/i, (m) => `/project/${m[1]}`],
  [/^\/jobs\/(\d+)\/work-diary\/?$/i, (m) => `/work-diary/${m[1]}`],
  [/^\/jobs\/(\d+)\/?$/i, (m) => `/jobs/${m[1]}`],
  [/^\/jobs\/?$/i, () => `/jobs`],

  [/^\/employees\/new\/?$/i, () => `/employees/add`],
  [/^\/employees\/(\d+)\/work-hours\/?$/i, (m) => `/employees/work-hours/${m[1]}`],
  [/^\/employees\/(\d+)\/edit\/?$/i, (m) => `/employees/edit/${m[1]}`],
  [/^\/employees\/(\d+)\/?$/i, (m) => `/employees/view/${m[1]}`],
  [/^\/employees\/?$/i, () => `/employees`],

  [/^\/customers\/(\d+)\/?$/i, (m) => `/customers/view/${m[1]}`],
  [/^\/customers\/?$/i, () => `/customers`],
  [/^\/customer-teams\/?$/i, () => `/customerteam`],

  [/^\/work-diary\/(\d+)\/?$/i, (m) => `/employees/work-sessions/${m[1]}`],
  [/^\/work-diary\/?$/i, () => `/work-session`],
  [/^\/my-leaves\/?$/i, () => `/employeeleaves`],
  [/^\/leaves\/?$/i, () => `/leaves`],
  [/^\/my-grading\/?$/i, () => `/my-grading`],
  // No classic counterpart -> nearest sensible home.
  [/^\/internee-grading\/?$/i, () => `/employees`],

  [/^\/download\/?$/i, () => `/application`],
  [/^\/notification-settings\/?$/i, () => `/notification-settings`],
  [/^\/notifications\/?$/i, () => `/notifications`],
  [/^\/profile\/?$/i, () => `/profile`],
  [/^\/subscriptions\/?$/i, () => `/subscriptions`],
  [/^\/contracts\/templates\/(\d+)\/edit\/?$/i, (m) => `/contracts/templates/${m[1]}/edit`],
  [/^\/contracts\/templates\/new\/?$/i, () => `/contracts/templates/new`],
  [/^\/contracts\/send\/?$/i, () => `/contracts/send`],
  [/^\/contracts\/?$/i, () => `/contracts`],
  [/^\/chat\/(\d+)\/?$/i, () => `/chat`],
  [/^\/chat\/?$/i, () => `/chat`],
  [/^\/team\/?$/i, () => `/team`],
  [/^\/teamaccess\/?$/i, () => `/teamaccess`],
  [/^\/my-dashboard\/?$/i, () => `/dashboard`],
  [/^\/dashboard\/?$/i, () => `/dashboard`],
];

function translate(rules, pathname, fallback) {
  const path = pathname || "/";
  for (const [pattern, build] of rules) {
    const m = path.match(pattern);
    if (m) return build(m);
  }
  return fallback;
}

/** Classic path -> the equivalent path inside v2 (no /v2 prefix). */
export function classicToV2(pathname) {
  return translate(CLASSIC_TO_V2, pathname, "/jobs");
}

/** v2 path (already stripped of /v2) -> the equivalent classic path. */
export function v2ToClassic(pathname) {
  return translate(V2_TO_CLASSIC, pathname, "/jobs");
}

/** True when the screen you're on has a real counterpart, not a fallback. */
export function hasCounterpart(rules, pathname) {
  return rules.some(([pattern]) => (pathname || "/").match(pattern));
}

export const CLASSIC_RULES = CLASSIC_TO_V2;
export const V2_RULES = V2_TO_CLASSIC;
