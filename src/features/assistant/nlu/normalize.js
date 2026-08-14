/**
 * Text normalisation for the assistant's parser.
 *
 * Order matters and is load-bearing. The old parser stripped punctuation first,
 * which destroyed "what's" (-> "what s") and turned "no. of jobs" into a token
 * stream where "no" read as a negation. Contractions and the number-of rewrite
 * therefore run BEFORE punctuation is removed.
 *
 * Everything here is pure: same input, same output, no clock, no network.
 */

const CONTRACTIONS = [
  [/\bwhat['’]?s\b/g, "what is"],
  [/\bthat['’]?s\b/g, "that is"],
  [/\bthere['’]?s\b/g, "there is"],
  [/\bhere['’]?s\b/g, "here is"],
  [/\blet['’]?s\b/g, "let us"],
  [/\bi['’]m\b/g, "i am"],
  [/\bi['’]ve\b/g, "i have"],
  [/\bi['’]d\b/g, "i would"],
  [/\bwe['’]re\b/g, "we are"],
  [/\byou['’]re\b/g, "you are"],
  [/\bdon['’]?t\b/g, "do not"],
  [/\bdoesn['’]?t\b/g, "does not"],
  [/\bdidn['’]?t\b/g, "did not"],
  [/\bisn['’]?t\b/g, "is not"],
  [/\baren['’]?t\b/g, "are not"],
  [/\bwasn['’]?t\b/g, "was not"],
  [/\bcan['’]?t\b/g, "can not"],
  [/\bcannot\b/g, "can not"],
  [/\bwon['’]?t\b/g, "will not"],
  [/\bhaven['’]?t\b/g, "have not"],
  [/\bhasn['’]?t\b/g, "has not"],
  [/\bshouldn['’]?t\b/g, "should not"],
];

const POSSESSIVES = [
  [/\btoday['’]?s\b/g, "today"],
  [/\btomorrow['’]?s\b/g, "tomorrow"],
  [/\byesterday['’]?s\b/g, "yesterday"],
  [/\bweek['’]?s\b/g, "week"],
  [/\bmonth['’]?s\b/g, "month"],
  [/\byear['’]?s\b/g, "year"],
];

/**
 * Lowercased, de-accented, punctuation-free token string.
 * Digits survive so "7 days" and "next 3 days" still parse.
 */
export function norm(input) {
  let s = String(input ?? "");

  // Strip accents so "José" and "Jose" are the same person.
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.toLowerCase();

  // Smart punctuation -> ASCII, before anything looks for apostrophes.
  s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");

  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  for (const [re, to] of POSSESSIVES) s = s.replace(re, to);

  // "no. of jobs" / "no of jobs" -> "number of jobs". Without this the leading
  // "no" is read as a negation and the whole question inverts.
  s = s.replace(/\bno\.?\s+of\b/g, "number of");
  s = s.replace(/\bnos\.?\s+of\b/g, "number of");
  s = s.replace(/\b#\s*of\b/g, "number of");

  // Generic trailing possessive on anything left ("ahmed's tasks").
  s = s.replace(/(\w)['’]s\b/g, "$1");

  // Keep digits, @ (emails) and + ; everything else becomes a separator.
  s = s.replace(/[^a-z0-9@+]+/g, " ");

  return s.replace(/\s+/g, " ").trim();
}

export function tokenize(input) {
  const n = norm(input);
  return n ? n.split(" ") : [];
}

/**
 * Explicit dates must be read BEFORE punctuation is stripped, because
 * "12/08/2026" and "2026-08-12" lose their separators in norm().
 * Returns an ISO day string or null. Deliberately conservative — it only
 * accepts unambiguous forms.
 */
export function extractExplicitDate(input) {
  const raw = String(input ?? "");

  // ISO: 2026-08-12
  const isoM = raw.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoM) {
    const [, y, m, d] = isoM;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // "12 Aug 2026" / "12 August" / "Aug 12" / "August 12 2026"
  const MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const monthAlt = Object.keys(MONTHS).join("|");
  const dmy = raw.toLowerCase().match(new RegExp(`\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(${monthAlt})[a-z]*\\.?(?:\\s+(\\d{4}))?\\b`));
  const mdy = raw.toLowerCase().match(new RegExp(`\\b(${monthAlt})[a-z]*\\.?\\s+(\\d{1,2})\\s*(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`));

  const build = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  if (dmy) {
    const d = Number(dmy[1]);
    const m = MONTHS[dmy[2].slice(0, 4)] ?? MONTHS[dmy[2].slice(0, 3)];
    const y = dmy[3] ? Number(dmy[3]) : null;
    if (m && d >= 1 && d <= 31) return { month: m, day: d, year: y, iso: y ? build(y, m, d) : null };
  }
  if (mdy) {
    const m = MONTHS[mdy[1].slice(0, 4)] ?? MONTHS[mdy[1].slice(0, 3)];
    const d = Number(mdy[2]);
    const y = mdy[3] ? Number(mdy[3]) : null;
    if (m && d >= 1 && d <= 31) return { month: m, day: d, year: y, iso: y ? build(y, m, d) : null };
  }

  // Numeric d/m/y — ambiguous by locale, so only accept when day > 12 makes it
  // unambiguous, or when a 4-digit year pins it.
  const slash = raw.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : null;
    if (a > 12 && b <= 12) return { month: b, day: a, year: y, iso: y ? build(y, b, a) : null };
    if (b > 12 && a <= 12) return { month: a, day: b, year: y, iso: y ? build(y, a, b) : null };
    // Genuinely ambiguous (e.g. 05/06) — refuse rather than guess.
    return { ambiguous: true };
  }

  return null;
}
