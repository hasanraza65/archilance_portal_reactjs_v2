import { FUZZY_TARGETS, ABBREV, NEVER_FUZZ, FILLER } from "./lexicon";

/**
 * Bounded Damerau-Levenshtein.
 *
 * Bounded because we only ever care "is this within 1 or 2 edits" — the full
 * matrix is wasted work. Adjacent transposition costs 1 so "taks" -> "tasks"
 * and "flie" -> "file" resolve, which plain Levenshtein would score 2.
 */
export function boundedLevenshtein(a, b, max = 2) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev2 = null;
  let prev = new Array(bl + 1);
  let cur = new Array(bl + 1);
  for (let j = 0; j <= bl; j += 1) prev[j] = j;

  for (let i = 1; i <= al; i += 1) {
    cur[0] = i;
    let rowMin = cur[0];
    const lo = Math.max(1, i - max);
    const hi = Math.min(bl, i + max);
    // Cells outside the band can never beat `max`.
    for (let j = 1; j < lo; j += 1) cur[j] = max + 1;
    for (let j = lo; j <= hi; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1); // transposition
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    for (let j = hi + 1; j <= bl; j += 1) cur[j] = max + 1;
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
    cur = new Array(bl + 1);
  }
  return prev[bl];
}

/**
 * Accept a correction only when the words are long enough that a single edit is
 * overwhelmingly likely to be a typo rather than a different word.
 *
 * Uses the MAX of the two lengths on purpose: "tsks" (4) -> "tasks" (5) should
 * pass, and it only does if the longer word sets the bar.
 */
function acceptable(input, target, dist) {
  const L = Math.max(input.length, target.length);
  if (dist === 0) return true;
  if (dist === 1) return L >= 5;
  if (dist === 2) return L >= 8;
  return false;
}

/**
 * token -> { token, viaFuzzy } where token is the corrected form, or null when
 * nothing safe was found.
 *
 * Determinism rule: if two targets tie at the minimum distance we return
 * nothing. A coin flip between "high" and "hold" is worse than not matching —
 * the caller degrades to a broader answer instead of a confidently wrong one.
 */
export function canonicalToken(token) {
  if (!token) return null;
  if (FILLER.has(token)) return { token, viaFuzzy: false };

  // Exact vocabulary hit — nothing to correct.
  if (FUZZY_TARGETS.has(token)) return { token, viaFuzzy: false };

  // Known shorthand beats distance maths.
  const abbrev = ABBREV.get(token);
  if (abbrev) return { token: abbrev, viaFuzzy: false };

  // Words that are one edit from a target but mean something else.
  if (NEVER_FUZZ.has(token)) return { token, viaFuzzy: false };
  if (token.length < 4) return { token, viaFuzzy: false };
  if (/^\d+$/.test(token)) return { token, viaFuzzy: false };

  let best = null;
  let bestDist = Infinity;
  let tied = false;

  for (const target of FUZZY_TARGETS.keys()) {
    if (Math.abs(target.length - token.length) > 2) continue;
    const d = boundedLevenshtein(token, target, 2);
    if (d > 2) continue;
    if (!acceptable(token, target, d)) continue;
    if (d < bestDist) {
      bestDist = d;
      best = target;
      tied = false;
    } else if (d === bestDist && target !== best) {
      tied = true;
    }
  }

  if (best === null || tied) return { token, viaFuzzy: false };
  return { token: best, viaFuzzy: true };
}

/** Applies canonicalToken across a token array, preserving positions. */
export function canonicalizeTokens(tokens) {
  return tokens.map((t) => {
    const r = canonicalToken(t);
    return { raw: t, token: r.token, viaFuzzy: r.viaFuzzy };
  });
}
