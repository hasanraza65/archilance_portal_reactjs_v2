import { tokenize } from "./normalize";
import { matchPhrases } from "./match";
import { extractAll } from "./slots";
import { scoreIntents, pickIntent } from "./intents";

/**
 * text -> { intent, confidence, margin, slots, alternatives, debug }
 *
 * Completely offline and synchronous. Person and job names come back as an
 * UNRESOLVED candidate span in slots.scope — resolving them needs the roster,
 * which is the runner's job, not the parser's.
 */

/** Below this the runner should clarify rather than answer. */
export const CONFIDENCE_FLOOR = 2.5;
/** Two intents this close together are a genuine toss-up. */
export const MARGIN_FLOOR = 1.0;

export function parse(text) {
  const raw = String(text ?? "");
  const tokens = tokenize(raw);

  if (tokens.length === 0) {
    return { intent: "help", confidence: 0, margin: 0, slots: emptySlots(), alternatives: [], debug: { tokens } };
  }

  const m = matchPhrases(tokens);
  const slots = extractAll(m, raw);
  const scored = scoreIntents(m, slots);
  let { intent, confidence, margin, second } = pickIntent(scored);

  // A bare time or priority phrase with no other signal is still a work
  // question: "anything urgent?", "overdue?", "today?"
  if (scored.length === 0) {
    const hasSignal = slots.time || slots.priority || slots.layer || slots.status || slots.open;
    if (slots.time === "overdue") { intent = "deadlines.overdue"; confidence = CONFIDENCE_FLOOR; }
    else if (slots.time) { intent = "deadlines.due"; confidence = CONFIDENCE_FLOOR; }
    else if (hasSignal) { intent = "list.work"; confidence = CONFIDENCE_FLOOR; }
    // "what is assigned to me" / "what's on my plate" — a scope with no other
    // signal is still a request to see that person's work.
    else if (slots.scope?.kind === "me" || slots.scope?.kind === "team") { intent = "list.work"; confidence = CONFIDENCE_FLOOR; }
    else {
      // Nothing was understood. A bare unrecognised word is NOT a weak answer,
      // it's no answer — score it 0 so the runner asks instead of guessing.
      intent = "help";
      confidence = 0;
    }
  }

  // "how many ... overdue" is a count question about overdue work, not a list.
  if (slots.aggregate === "COUNT" && intent.startsWith("deadlines.")) {
    slots.countMode = true;
  }

  return {
    intent,
    confidence,
    margin,
    slots,
    alternatives: scored.slice(0, 3),
    // Boolean(): `second && ...` yields null when there is no runner-up, and a
    // null here silently disabled the whole clarify path.
    ambiguous: Boolean(confidence < CONFIDENCE_FLOOR || (second && margin < MARGIN_FLOOR)),
    debug: { tokens, spans: m.spans, leftovers: m.leftovers },
  };
}

function emptySlots() {
  return {
    time: null, timeDate: null, ambiguousDate: false,
    status: null, open: false, priority: null,
    layer: null, aggregate: null, scope: { kind: null }, negations: 0,
  };
}

export { matchPhrases, extractAll };
