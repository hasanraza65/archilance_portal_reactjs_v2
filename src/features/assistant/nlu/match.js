import { PHRASE_INDEX, MAX_PHRASE, FILLER, KIND } from "./lexicon";
import { canonicalToken } from "./fuzzy";

/**
 * Phrase-first, span-consuming matcher.
 *
 * TWO PASSES, and the order is the whole point:
 *   pass 1 matches phrases against the RAW tokens
 *   pass 2 fuzzy-corrects only what pass 1 left unconsumed, then matches again
 *
 * Correcting first would let a typo-fixer destroy a phrase that was already
 * valid. Real example from the corpus: "what's on my plate" — "plate" is within
 * one edit of "late", so a correct-then-match pipeline rewrote it to "on my
 * late" and answered with OVERDUE work. Matching first keeps "on my plate"
 * intact as a scope phrase, and fuzzy never sees those tokens at all.
 *
 * Longest n-grams win and consume their tokens, so a longer phrase can never be
 * shadowed by one of its own words:
 *   "next week"     -> next_week      (not upcoming + this_week)
 *   "in progress"   -> In Progress    (not __OPEN__ via "progress")
 *   "high priority" -> High
 *   "client review" -> Client Review  (not JOB via "client project")
 *
 * Everything runs on the token array. Nothing uses String.includes, which is
 * what let the old parser find "low" inside "follow".
 */

function sweep(words, consumed, spans, viaFuzzyAt) {
  for (let n = Math.min(MAX_PHRASE, words.length); n >= 1; n -= 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      let free = true;
      for (let k = i; k < i + n; k += 1) {
        if (consumed[k] || words[k] == null) { free = false; break; }
      }
      if (!free) continue;

      const phrase = words.slice(i, i + n).join(" ");
      const meta = PHRASE_INDEX.get(phrase);
      if (!meta) continue;

      let viaFuzzy = false;
      for (let k = i; k < i + n; k += 1) if (viaFuzzyAt[k]) viaFuzzy = true;

      spans.push({ canonical: meta.canonical, kind: meta.kind, start: i, end: i + n, phrase, viaFuzzy });
      for (let k = i; k < i + n; k += 1) consumed[k] = true;
    }
  }
}

export function matchPhrases(tokens) {
  const raw = tokens.slice();
  const consumed = new Array(raw.length).fill(false);
  const viaFuzzyAt = new Array(raw.length).fill(false);
  const spans = [];

  // Pass 1 — exact phrases on the untouched tokens.
  sweep(raw, consumed, spans, viaFuzzyAt);

  // Pass 2 — correct only what survived, then match again.
  const corrected = raw.slice();
  let anyCorrection = false;
  for (let i = 0; i < corrected.length; i += 1) {
    if (consumed[i]) continue;
    const r = canonicalToken(corrected[i]);
    if (r && r.token !== corrected[i]) {
      corrected[i] = r.token;
      viaFuzzyAt[i] = r.viaFuzzy;
      anyCorrection = true;
    }
  }
  if (anyCorrection) sweep(corrected, consumed, spans, viaFuzzyAt);

  spans.sort((a, b) => a.start - b.start);

  // Whatever is left and isn't filler is a candidate name/entity span.
  const leftovers = [];
  let run = null;
  for (let i = 0; i < corrected.length; i += 1) {
    const w = corrected[i];
    const free = !consumed[i] && !FILLER.has(w) && !/^\d+$/.test(w);
    // A single letter may EXTEND a name but never start one, so "Manager E"
    // keeps its initial while a stray "a" doesn't become a person.
    const isFree = free && (w.length > 1 || Boolean(run));
    if (isFree) {
      if (!run) run = { start: i, end: i + 1, tokens: [raw[i]] };
      else { run.end = i + 1; run.tokens.push(raw[i]); }
    } else if (run) {
      leftovers.push(run);
      run = null;
    }
  }
  if (run) leftovers.push(run);

  return {
    words: corrected,
    raw,
    spans,
    consumed,
    leftovers: leftovers.map((l) => ({ ...l, text: l.tokens.join(" ") })),
    has: (canonical) => spans.some((s) => s.canonical === canonical),
    ofKind: (kind) => spans.filter((s) => s.kind === kind),
    firstOf: (kind) => spans.find((s) => s.kind === kind) || null,
    /** Tokens that carried real meaning — used to tell a greeting from a request. */
    contentCount: () => spans.filter((s) => s.kind !== KIND.FILLER).length,
  };
}

export { KIND };
