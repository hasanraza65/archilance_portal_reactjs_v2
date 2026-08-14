import { KIND } from "./lexicon";
import { extractExplicitDate } from "./normalize";
import { norm } from "./normalize";

/**
 * Slot extraction. Pure — no I/O, no name resolution, no clock reads beyond the
 * caller-supplied `today`.
 *
 * Every extractor reads the matched SPANS, never the raw string, so a slot can
 * only come from a phrase the matcher actually consumed.
 */

/** Time window, honouring negation ("not overdue"), numbers and explicit dates. */
export function extractTime(m, rawText) {
  const spans = m.ofKind(KIND.TIME);
  const explicit = extractExplicitDate(rawText);

  if (explicit && !explicit.ambiguous) {
    return { window: "on_date", date: explicit, negated: false };
  }
  if (explicit?.ambiguous) {
    return { window: null, ambiguousDate: true, negated: false };
  }

  // Numeric ranges: "last 3 months", "past 10 days", "next 2 weeks". Read from
  // the normalised string because the tokens themselves ("3", "months") are
  // consumed piecemeal by other rules.
  const text = norm(rawText);
  const UNIT = { day: 1, week: 7, month: 30 };
  const past = text.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+(day|week|month)s?\b/);
  if (past) {
    const days = Number(past[1]) * UNIT[past[2]];
    return { window: "past_n", days, unitLabel: `${past[1]} ${past[2]}${Number(past[1]) === 1 ? "" : "s"}`, negated: false };
  }
  const next = text.match(/\b(?:next|coming|within|in)\s+(\d{1,3})\s+(day|week|month)s?\b/);
  if (next) {
    const days = Number(next[1]) * UNIT[next[2]];
    return { window: "next_n", days, unitLabel: `${next[1]} ${next[2]}${Number(next[1]) === 1 ? "" : "s"}`, negated: false };
  }

  if (spans.length === 0) return { window: null, negated: false };

  // A concrete window always beats a vague one: "what's coming up next week"
  // must resolve to next_week, not to the fuzzy "upcoming" that appeared first.
  const VAGUE = new Set(["upcoming"]);
  const chosen = spans.find((s) => !VAGUE.has(s.canonical)) || spans[0];
  const negated = isNegated(m, chosen.start);
  return { window: chosen.canonical, negated };
}

/** Explicit status literal, or the pseudo-status __OPEN__. */
export function extractStatus(m) {
  const spans = m.ofKind(KIND.STATUS);
  if (spans.length === 0) return { status: null, open: false, negated: false };
  const chosen = spans[0];
  const negated = isNegated(m, chosen.start);
  if (chosen.canonical === "__OPEN__") return { status: null, open: !negated, negated };
  return { status: chosen.canonical, open: false, negated };
}

export function extractPriority(m) {
  const spans = m.ofKind(KIND.PRIORITY);
  if (spans.length === 0) return { priority: null, negated: false };
  const chosen = spans[0];
  return { priority: chosen.canonical, negated: isNegated(m, chosen.start) };
}

/**
 * Which layer the question is about.
 *
 * JOB / PROJECT / TASK are the UI's words (see lexicon header). ANY means the
 * user said something generic like "work" or "items" and both layers count.
 * Returns null when nothing entity-ish was said at all.
 */
export function extractLayer(m) {
  const spans = m.ofKind(KIND.ENTITY);
  if (spans.length === 0) return null;
  // An explicit JOB/PROJECT/TASK always beats the generic ANY.
  const specific = spans.find((s) => s.canonical !== "ANY");
  return specific ? specific.canonical : "ANY";
}

/** COUNT vs BREAKDOWN vs LIST. Count wins — "how many" is unambiguous. */
export function extractAggregate(m) {
  if (m.has("COUNT")) return "COUNT";
  if (m.has("BREAKDOWN")) return "BREAKDOWN";
  if (m.has("LIST")) return "LIST";
  return null;
}

/**
 * Scope: me / team / unassigned / a candidate person span.
 *
 * The candidate is NOT resolved here — parse() must stay offline. The runner
 * resolves it against the real roster, and a span that matches nobody is
 * dropped rather than silently filtering everything away. That is the fix for
 * the old detectScope regex, which turned the "of" in "number of jobs" into a
 * person named "jobs".
 */
export function extractScope(m) {
  const spans = m.ofKind(KIND.SCOPE);
  const explicit = spans[0];
  if (explicit) {
    if (explicit.canonical === "ME") return { kind: "me" };
    if (explicit.canonical === "TEAM") return { kind: "team" };
    if (explicit.canonical === "UNASSIGNED") return { kind: "unassigned" };
  }
  // A leftover run of 1-3 words is a plausible person or entity name.
  const cand = m.leftovers.find((l) => l.end - l.start <= 3);
  if (cand) return { kind: "candidate", text: cand.text, span: cand };
  return { kind: null };
}

/** True when a NOT span sits within two tokens before `index`. */
function isNegated(m, index) {
  return m.spans.some((s) => s.kind === KIND.NEGATION && s.end <= index && index - s.end <= 2);
}

/** Head-count subject: EMPLOYEES / CUSTOMERS / USERS, or null. */
export function extractPeople(m) {
  const span = m.ofKind(KIND.PEOPLE)[0];
  return span ? span.canonical : null;
}

export function extractAll(m, rawText) {
  const time = extractTime(m, rawText);
  const status = extractStatus(m);
  const priority = extractPriority(m);
  return {
    time: time.window,
    timeDays: time.days || null,
    timeUnitLabel: time.unitLabel || null,
    timeDate: time.date || null,
    ambiguousDate: Boolean(time.ambiguousDate),
    status: status.status,
    open: status.open,
    priority: priority.priority,
    layer: extractLayer(m),
    people: extractPeople(m),
    aggregate: extractAggregate(m),
    scope: extractScope(m),
    negations: m.ofKind(KIND.NEGATION).length,
  };
}
