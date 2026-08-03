/**
 * THE only date arithmetic in the assistant.
 *
 * Due dates arrive as "YYYY-MM-DD" (or an ISO timestamp). Parsing those with
 * `new Date(str)` treats a bare date as UTC midnight, which in any negative-UTC
 * timezone lands on the PREVIOUS day — "due today" would quietly drop items.
 * Everything below builds local dates explicitly.
 */

/** "2026-08-12" or "2026-08-12T09:00:00Z" -> local midnight Date, or null. */
export function parseApiDay(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today. Negative = overdue, 0 = today. */
export function dayDiff(value) {
  const d = parseApiDay(value);
  if (!d) return null;
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
}

export function toKey(date) {
  const d = date instanceof Date ? date : parseApiDay(date);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * A named window -> an inclusive day-offset range, or a predicate for the
 * open-ended ones. `null` when the window doesn't constrain dates.
 */
export function resolveWindow(window, explicitDate = null, days = null, unitLabel = null) {
  switch (window) {
    case "past_week":   return { from: -7, to: -1, label: "in the last week" };
    case "past_month":  return { from: -30, to: -1, label: "in the last month" };
    case "past_n":     return days ? { from: -days, to: -1, label: `in the last ${unitLabel || `${days} days`}` } : null;
    case "next_n":     return days ? { from: 0, to: days, label: `due in the next ${unitLabel || `${days} days`}` } : null;
    case "overdue":     return { from: -Infinity, to: -1, label: "overdue" };
    case "today":       return { from: 0, to: 0, label: "due today" };
    case "tomorrow":    return { from: 1, to: 1, label: "due tomorrow" };
    case "yesterday":   return { from: -1, to: -1, label: "due yesterday" };
    case "this_week":   return { from: 0, to: 7, label: "due in the next 7 days" };
    case "next_week":   return { from: 8, to: 14, label: "due next week" };
    case "this_month":  return { from: 0, to: 30, label: "due in the next 30 days" };
    case "next_month":  return { from: 31, to: 60, label: "due next month" };
    case "upcoming":    return { from: 0, to: Infinity, label: "coming up" };
    case "on_date": {
      if (!explicitDate) return null;
      const target = explicitDateToDay(explicitDate);
      if (target === null) return null;
      return { from: target, to: target, label: `due on ${explicitDateLabel(explicitDate)}` };
    }
    default: return null;
  }
}

function explicitDateToDay(explicit) {
  if (explicit?.iso) return dayDiff(explicit.iso);
  if (explicit?.month && explicit?.day) {
    // No year given — assume the next occurrence, so "due 5 Jan" asked in
    // December means next January rather than eleven months ago.
    const now = startOfToday();
    let year = explicit.year || now.getFullYear();
    let d = new Date(year, explicit.month - 1, explicit.day);
    if (!explicit.year && d < now) d = new Date(year + 1, explicit.month - 1, explicit.day);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  }
  return null;
}

function explicitDateLabel(explicit) {
  if (explicit?.iso) return formatDay(explicit.iso);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (explicit?.month && explicit?.day) return `${explicit.day} ${MONTHS[explicit.month - 1]}`;
  return "that date";
}

export function inWindow(value, range) {
  if (!range) return true;
  const diff = dayDiff(value);
  if (diff === null) return false;
  return diff >= range.from && diff <= range.to;
}

/** "Today", "Tomorrow", "12 Aug" or "12 Aug 2027" when the year differs. */
export function formatDay(value) {
  const d = parseApiDay(value);
  if (!d) return "no date";
  const diff = dayDiff(value);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "3 days late" / "in 5 days" — used in deadline answers. */
export function relativeDue(value) {
  const diff = dayDiff(value);
  if (diff === null) return "no due date";
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `due in ${diff} days`;
}
