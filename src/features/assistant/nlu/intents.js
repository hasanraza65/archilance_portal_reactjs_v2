/**
 * Declarative intent table + scorer.
 *
 * Each intent lists the canonical terms that pull toward it (`cues`), terms that
 * push away (`blocks`), and an optional `when` predicate over the extracted
 * slots. Scoring is deterministic and the winner must beat the runner-up by a
 * margin — otherwise parse() reports low confidence and the runner asks a
 * single clarifying question instead of guessing.
 *
 * `specialises` encodes "this is a narrower reading of that": deadlines.overdue
 * outranks deadlines.due whenever both fire, without needing a bigger score.
 */

const CONCRETE = new Set(["today", "tomorrow", "this_week", "next_week", "this_month", "next_month", "on_date"]);

export const INTENT_DEFS = [
  /* ------------------------------ deadlines ----------------------------- */
  {
    id: "deadlines.overdue",
    cues: ["overdue"],
    weight: { overdue: 6 },
    specialises: "deadlines.due",
  },
  {
    id: "deadlines.next",
    cues: ["CUE_NEXT", "CUE_DUE"],
    weight: { CUE_NEXT: 3, CUE_DUE: 2 },
    when: (s, m) => m.has("CUE_NEXT") && (m.has("CUE_DUE") || s.time === "upcoming"),
    specialises: "deadlines.due",
  },
  {
    id: "deadlines.latest",
    cues: ["CUE_LATEST", "CUE_DUE"],
    weight: { CUE_LATEST: 3, CUE_DUE: 2 },
    blocks: ["CUE_HOURS"],
    when: (s, m) => m.has("CUE_LATEST") && m.has("CUE_DUE"),
    specialises: "deadlines.due",
  },
  {
    id: "deadlines.upcoming",
    cues: ["upcoming", "CUE_DUE"],
    weight: { upcoming: 4, CUE_DUE: 1.5 },
    when: (s, m) => (m.has("upcoming") && !CONCRETE.has(s.time))
      || (m.has("CUE_SUMMARY") && m.has("CUE_DUE")),
    specialises: "deadlines.due",
  },
  {
    id: "deadlines.risk",
    cues: ["CUE_RISK"],
    weight: { CUE_RISK: 5 },
  },
  {
    id: "deadlines.due",
    cues: ["CUE_DUE", "today", "tomorrow", "this_week", "next_week", "this_month", "next_month"],
    weight: { CUE_DUE: 4, today: 3, tomorrow: 3, this_week: 2.5, next_week: 2.5, this_month: 2.5, next_month: 2.5 },
    blocks: ["CUE_LEAVE", "CUE_WHO_OUT", "CUE_HOURS", "CUE_SCHEDULE", "CUE_WORKLOAD"],
  },

  /* -------------------------------- counts ------------------------------ */
  {
    id: "count.jobs",
    cues: ["COUNT", "JOB"],
    weight: { COUNT: 3, JOB: 4 },
    when: (s) => s.aggregate === "COUNT" && s.layer === "JOB" && !s.status && !s.priority,
  },
  {
    id: "count.projects",
    cues: ["COUNT", "PROJECT"],
    weight: { COUNT: 3, PROJECT: 4 },
    when: (s) => s.aggregate === "COUNT" && s.layer === "PROJECT" && !s.status && !s.priority,
  },
  {
    id: "count.tasks",
    cues: ["COUNT", "TASK", "ANY"],
    weight: { COUNT: 3, TASK: 4, ANY: 2 },
    // A status or priority in the sentence makes this a BREAKDOWN question, not
    // a plain total — "how many tasks are in progress" is count.by_status.
    blocks: ["CUE_HOURS", "CUE_IDLE", "CUE_PRODUCTIVITY", "CUE_LEAVE", "CUE_SCHEDULE"],
    when: (s) => s.aggregate === "COUNT" && (s.layer === "TASK" || s.layer === "ANY")
      && !s.status && !s.priority && !s.open,
  },
  {
    id: "count.open",
    cues: ["COUNT", "__OPEN__"],
    weight: { COUNT: 2.5, __OPEN__: 4 },
    blocks: ["CUE_LEAVE", "CUE_HOURS"],
    when: (s) => s.aggregate === "COUNT" && s.open,
  },
  {
    id: "count.by_status",
    cues: ["BY_STATUS", "BREAKDOWN", "COUNT"],
    weight: { BY_STATUS: 7, BREAKDOWN: 3, COUNT: 2 },
    // Either an explicit "by status" grouping, or a count scoped to one status.
    when: (s, m) => m.has("BY_STATUS")
      || ((s.aggregate === "BREAKDOWN" || s.aggregate === "COUNT") && Boolean(s.status)),
    bonus: (s) => (s.status && s.aggregate === "COUNT" ? 4 : 0),
  },
  {
    id: "count.by_priority",
    cues: ["BY_PRIORITY", "BREAKDOWN", "COUNT"],
    weight: { BY_PRIORITY: 7, BREAKDOWN: 3, COUNT: 2 },
    when: (s, m) => m.has("BY_PRIORITY")
      || ((s.aggregate === "BREAKDOWN" || s.aggregate === "COUNT") && Boolean(s.priority)),
    bonus: (s) => (s.priority && s.aggregate === "COUNT" ? 4 : 0),
  },

  {
    id: "count.people",
    cues: ["EMPLOYEES", "CUSTOMERS", "USERS", "COUNT"],
    weight: { EMPLOYEES: 5, CUSTOMERS: 5, USERS: 5, COUNT: 2 },
    blocks: ["CUE_LEAVE", "CUE_WORKLOAD", "CUE_HOURS"],
    // Strictly a HEAD-COUNT: needs an explicit "how many"/"count" AND no task
    // vocabulary. "tasks waiting on client" mentions clients but is about
    // tasks; "how many customers do we have" is about people.
    when: (s) => Boolean(s.people) && s.aggregate === "COUNT" && !s.layer,
  },

  /* --------------------------------- work -------------------------------- */
  {
    id: "list.work",
    cues: ["LIST", "ANY", "JOB", "PROJECT", "TASK", "__OPEN__", "Urgent", "High", "UNASSIGNED",
      "In Progress", "On Hold", "Backlog", "Completed", "Awaiting Info", "In-house review", "Client Review"],
    weight: {
      LIST: 2.5, ANY: 2, JOB: 2, PROJECT: 2, TASK: 2, __OPEN__: 1.5, Urgent: 2, High: 1, UNASSIGNED: 3,
      "In Progress": 2, "On Hold": 2.5, Backlog: 2, Completed: 2,
      "Awaiting Info": 2.5, "In-house review": 2.5, "Client Review": 2.5,
    },
    // A time window makes it a deadline question ("show me today's tasks" asks
    // what is DUE today), and "how many" makes it a count question. Either way
    // this is no longer a plain list.
    bonus: (s) => (s.time ? -4 : 0) + (s.aggregate === "COUNT" ? -5 : 0),
  },

  /* --------------------------------- time -------------------------------- */
  {
    id: "hours.tracked",
    cues: ["CUE_HOURS", "CUE_IDLE", "CUE_PRODUCTIVITY"],
    weight: { CUE_HOURS: 5, CUE_IDLE: 5, CUE_PRODUCTIVITY: 5 },
    blocks: ["CUE_SCHEDULE"],
  },
  {
    id: "hours.last_session",
    cues: ["CUE_LATEST", "CUE_HOURS"],
    weight: { CUE_LATEST: 4, CUE_HOURS: 4 },
    // "my LAST session" — but not "LAST 3 months", where "last" opens a time
    // span. Any resolved past-range window means the span reading wins.
    when: (s, m) => m.has("CUE_LATEST") && m.has("CUE_HOURS")
      && !["past_n", "past_week", "past_month"].includes(s.time),
    specialises: "hours.tracked",
  },
  {
    id: "hours.schedule",
    cues: ["CUE_SCHEDULE"],
    weight: { CUE_SCHEDULE: 6 },
    bonus: (s) => (s.time ? -4 : 0),
  },

  /* -------------------------------- leave -------------------------------- */
  {
    id: "leaves.queue",
    cues: ["CUE_LEAVE", "CUE_APPROVAL", "CUE_WHO_OUT"],
    weight: { CUE_LEAVE: 3, CUE_APPROVAL: 5, CUE_WHO_OUT: 8 },
    when: (s, m) => (m.has("CUE_WHO_OUT"))
      || (m.has("CUE_LEAVE") && s.scope?.kind !== "me"
          && (m.has("CUE_APPROVAL") || s.scope?.kind === "team")),
    specialises: "leaves.mine",
  },
  {
    id: "leaves.mine",
    cues: ["CUE_LEAVE"],
    weight: { CUE_LEAVE: 5 },
  },

  /* -------------------------------- people ------------------------------- */
  {
    id: "team.free",
    cues: ["CUE_WORKLOAD"],
    weight: { CUE_WORKLOAD: 4 },
    when: (s, m) => m.spans.some((x) => ["free", "available", "capacity", "bandwidth"].includes(x.phrase)),
    specialises: "team.workload",
  },
  {
    id: "team.workload",
    cues: ["CUE_WORKLOAD", "TEAM"],
    weight: { CUE_WORKLOAD: 5, TEAM: 2 },
  },

  /* ------------------------------- lookups ------------------------------- */
  {
    id: "entity.lookup",
    cues: ["CUE_STATUS_OF", "CUE_DUE", "JOB", "PROJECT", "ANY"],
    weight: { CUE_STATUS_OF: 6, CUE_DUE: 3, JOB: 2, PROJECT: 2, ANY: 1.5 },
    // Fires whenever the sentence contains an unresolved NAME. Whether that
    // name is a person or a Job is not knowable offline, so the parser does not
    // guess: runIntent resolves the span against the roster and the job list,
    // and re-routes to list.work (scoped to that person) when it turns out to
    // be someone rather than something. A name matching neither is dropped, so
    // a stray word can never silently filter the whole answer away.
    when: (s) => s.scope?.kind === "candidate" && String(s.scope.text || "").length >= 3,
    bonus: (s, m) => (m.has("CUE_STATUS_OF") ? 2 : 0),
  },

  /* --------------------------------- help -------------------------------- */
  {
    id: "help",
    cues: ["CUE_HELP", "CUE_THANKS"],
    weight: { CUE_HELP: 6, CUE_THANKS: 6 },
    // A greeting only wins when it is essentially the whole message. "show me
    // the work I must finish today, thanks" is a request with a polite tail,
    // not a thank-you.
    bonus: (s, m) => {
      const contentful = m.spans.filter((x) =>
        !["CUE_HELP", "CUE_THANKS"].includes(x.canonical)).length;
      return contentful > 0 ? -8 : 0;
    },
  },
  {
    id: "summary.overview",
    cues: ["CUE_SUMMARY"],
    weight: { CUE_SUMMARY: 6 },
  },
];

const BY_ID = new Map(INTENT_DEFS.map((d) => [d.id, d]));

/** Scores every intent. Fuzzy-derived spans contribute at 0.8 so an exact competitor always wins. */
export function scoreIntents(m, slots) {
  const present = new Map(); // canonical -> best multiplier seen
  for (const s of m.spans) {
    const mult = s.viaFuzzy ? 0.8 : 1;
    present.set(s.canonical, Math.max(present.get(s.canonical) ?? 0, mult));
  }

  const scored = [];
  for (const def of INTENT_DEFS) {
    let score = 0;
    for (const cue of def.cues) {
      const mult = present.get(cue);
      if (mult) score += (def.weight?.[cue] ?? 1) * mult;
    }
    for (const blocked of def.blocks || []) {
      if (present.has(blocked)) score -= 4;
    }
    if (def.bonus) score += def.bonus(slots, m);
    if (score <= 0) continue;
    if (def.when && !def.when(slots, m)) continue;
    scored.push({ id: def.id, score });
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored;
}

/**
 * Winner + margin. `specialises` lets a narrower intent take precedence over the
 * broader one it refines even when their scores are close, which is what makes
 * "overdue" beat the generic deadline reading every time.
 */
export function pickIntent(scored) {
  if (scored.length === 0) return { intent: "help", confidence: 0, margin: 0, top: null, second: null };

  let top = scored[0];
  const second = scored[1] || null;

  if (second) {
    const topDef = BY_ID.get(top.id);
    const secondDef = BY_ID.get(second.id);
    // If the runner-up is a specialisation of the winner and is close, prefer it.
    if (secondDef?.specialises === top.id && second.score >= top.score - 2) {
      top = second;
    } else if (topDef?.specialises === second.id) {
      // already the narrower one — keep it
    }
  }

  const margin = second ? top.score - second.score : top.score;
  return { intent: top.id, confidence: top.score, margin, top, second };
}
