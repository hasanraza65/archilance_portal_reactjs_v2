/**
 * THE single vocabulary source for the assistant.
 *
 * Nothing outside this file may hardcode a keyword string. Every phrase is
 * matched against the TOKEN ARRAY (never String.includes), which structurally
 * removes the substring bugs the old parser had: "follow" containing "low",
 * "highlight" containing "high", "need to do" containing "to do".
 *
 * VOCABULARY WARNING — the UI's words are not the database's:
 *   DB `projects` table            -> UI "Job"
 *   root task (no parent_task_id)  -> UI "Project"
 *   child task (has parent)        -> UI "Task"
 * JOB / PROJECT / TASK below are the UI meanings. There is deliberately NO
 * fuzzy edge between them (see fuzzy.js NEVER_FUZZ + the unit test): confusing
 * a Job with a Project is the most damaging error this parser can make.
 */

export const KIND = {
  ENTITY: "ENTITY",
  PEOPLE: "PEOPLE",
  TIME: "TIME",
  STATUS: "STATUS",
  PRIORITY: "PRIORITY",
  AGG: "AGG",
  SCOPE: "SCOPE",
  CUE: "CUE",
  NEGATION: "NEGATION",
  FILLER: "FILLER",
};

/** canonical -> phrases (each phrase is 1..4 tokens, space separated) */
export const TERMS = [
  /* ------------------------------- ENTITY ------------------------------- */
  { canonical: "JOB", kind: KIND.ENTITY, phrases: [
    "job", "jobs", "engagement", "engagements", "commission", "commissions",
    "client project", "client projects", "client work", "client engagement",
    "account", "accounts", "contract work",
  ]},
  { canonical: "PROJECT", kind: KIND.ENTITY, phrases: [
    "project", "projects", "parent task", "parent tasks", "main task", "main tasks",
    "top level task", "top level tasks", "root task", "root tasks",
  ]},
  { canonical: "TASK", kind: KIND.ENTITY, phrases: [
    "subtask", "subtasks", "sub task", "sub tasks", "child task", "child tasks",
  ]},
  { canonical: "ANY", kind: KIND.ENTITY, phrases: [
    "task", "tasks", "item", "items", "work", "works", "deliverable", "deliverables",
    "thing", "things", "stuff", "anything", "everything", "what all",
    "activity", "activities", "assignment", "assignments", "to do list",
  ]},

  /* -------------------------------- TIME -------------------------------- */
  { canonical: "today", kind: KIND.TIME, phrases: [
    "today", "due today", "for today", "of today", "by today", "eod", "end of day", "by end of day",
  ]},
  { canonical: "tomorrow", kind: KIND.TIME, phrases: ["tomorrow", "next day", "tmrw", "tmw"] },
  { canonical: "yesterday", kind: KIND.TIME, phrases: ["yesterday"] },
  { canonical: "this_week", kind: KIND.TIME, phrases: [
    "this week", "current week", "the week", "in a week", "within a week",
    "7 days", "seven days", "next 7 days", "coming 7 days", "eow", "end of week", "by end of week",
  ]},
  { canonical: "next_week", kind: KIND.TIME, phrases: ["next week", "coming week", "following week", "upcoming week"] },
  { canonical: "this_month", kind: KIND.TIME, phrases: [
    "this month", "current month", "the month", "30 days", "thirty days", "next 30 days",
    "eom", "end of month", "by end of month",
  ]},
  { canonical: "next_month", kind: KIND.TIME, phrases: ["next month", "coming month", "following month"] },
  { canonical: "overdue", kind: KIND.TIME, phrases: [
    "overdue", "over due", "past due", "late", "already due", "missed deadline", "missed deadlines",
    "behind schedule", "behind", "expired", "elapsed", "date passed", "passed the deadline",
    "delayed", "has passed", "have passed", "passed", "crossed", "slipped", "was due", "were due",
  ]},
  { canonical: "past_week", kind: KIND.TIME, phrases: [
    "last week", "past week", "previous week",
  ]},
  { canonical: "past_month", kind: KIND.TIME, phrases: [
    "last month", "past month", "previous month",
  ]},
  { canonical: "upcoming", kind: KIND.TIME, phrases: [
    "upcoming", "coming up", "ahead", "soon", "shortly", "in future", "future", "later", "next up",
  ]},

  /* ------------------------------- STATUS -------------------------------- */
  { canonical: "In Progress", kind: KIND.STATUS, phrases: [
    "in progress", "in-progress", "ongoing", "working on", "under way", "underway", "started", "wip",
  ]},
  { canonical: "Completed", kind: KIND.STATUS, phrases: [
    "completed", "complete", "done", "finished", "closed", "delivered", "wrapped up",
  ]},
  { canonical: "Backlog", kind: KIND.STATUS, phrases: [
    "backlog", "not started", "todo", "to do", "yet to start", "queued", "new",
  ]},
  { canonical: "On Hold", kind: KIND.STATUS, phrases: [
    "on hold", "hold", "paused", "blocked", "stuck", "stalled", "halted", "frozen", "on ice",
  ]},
  { canonical: "Awaiting Info", kind: KIND.STATUS, phrases: [
    "awaiting info", "awaiting information", "waiting for info", "waiting info",
    "waiting on info", "need info", "needs info",
  ]},
  { canonical: "In-house review", kind: KIND.STATUS, phrases: [
    "in house review", "in-house review", "internal review", "inhouse review", "team review",
  ]},
  { canonical: "Client Review", kind: KIND.STATUS, phrases: [
    "client review", "customer review", "with the client", "with client", "client approval",
  ]},
  // Not a literal status — "open" means "anything not Completed".
  { canonical: "__OPEN__", kind: KIND.STATUS, phrases: [
    "open", "pending", "outstanding", "remaining", "unfinished", "incomplete", "not done",
    "left", "still left", "in hand", "active",
  ]},

  /* ------------------------------ PRIORITY ------------------------------- */
  { canonical: "Urgent", kind: KIND.PRIORITY, phrases: [
    "urgent", "critical", "asap", "emergency", "fire", "top priority", "highest priority",
  ]},
  { canonical: "High", kind: KIND.PRIORITY, phrases: ["high priority", "high"] },
  { canonical: "Normal", kind: KIND.PRIORITY, phrases: ["normal priority", "normal", "medium", "medium priority"] },
  { canonical: "Low", kind: KIND.PRIORITY, phrases: ["low priority", "low"] },

  /* ----------------------------- AGGREGATION ----------------------------- */
  { canonical: "COUNT", kind: KIND.AGG, phrases: [
    "how many", "number of", "count", "counts", "total", "totals", "how much work",
    "quantity", "tally", "sum", "total number",
  ]},
  // Split out so "count by status" routes without needing a status literal in
  // the sentence — the user is asking for the grouping itself.
  { canonical: "BY_STATUS", kind: KIND.AGG, phrases: [
    "by status", "per status", "status wise", "statuswise", "status breakdown", "status wise breakup",
    "group by status", "grouped by status", "across statuses",
  ]},
  { canonical: "BY_PRIORITY", kind: KIND.AGG, phrases: [
    "by priority", "per priority", "priority wise", "prioritywise", "priority breakdown",
    "group by priority", "grouped by priority",
  ]},
  { canonical: "BREAKDOWN", kind: KIND.AGG, phrases: [
    "breakdown", "break down", "breakup", "split", "grouped", "group by", "distribution",
  ]},
  { canonical: "LIST", kind: KIND.AGG, phrases: [
    "show", "list", "give", "display", "view", "see", "fetch", "pull up", "open",
    "which", "what are", "who are",
  ]},

  /* -------------------------------- PEOPLE -------------------------------- */
  // Head-count questions. Distinct from SCOPE ("team") and from task layers.
  { canonical: "EMPLOYEES", kind: KIND.PEOPLE, phrases: [
    "employee", "employees", "staff members", "workers", "workforce", "headcount",
    "head count", "team size", "team members",
  ]},
  { canonical: "CUSTOMERS", kind: KIND.PEOPLE, phrases: [
    "customer", "customers", "clients",
  ]},
  { canonical: "USERS", kind: KIND.PEOPLE, phrases: [
    "user", "users", "total users", "registered users",
  ]},

  /* -------------------------------- SCOPE -------------------------------- */
  { canonical: "ME", kind: KIND.SCOPE, phrases: [
    // Deliberately NO bare "me": "give me a summary of the Hilltop job" would
    // otherwise scope to the asker's own work instead of that job. Every form
    // below carries real first-person meaning.
    "my", "mine", "i have", "assigned to me", "i am assigned", "on my plate",
    "my side", "from my side", "for me", "to me", "myself", "i own",
  ]},
  { canonical: "TEAM", kind: KIND.SCOPE, phrases: [
    "team", "everyone", "everybody", "all members", "staff", "whole team", "the team",
    "company wide", "across the team", "all employees", "org", "organisation", "organization",
  ]},
  { canonical: "UNASSIGNED", kind: KIND.SCOPE, phrases: [
    "unassigned", "nobody", "no one", "not assigned", "without assignee", "no assignee",
  ]},

  /* ------------------------------ INTENT CUES ---------------------------- */
  { canonical: "CUE_DUE", kind: KIND.CUE, phrases: [
    "due", "deadline", "deadlines", "due date", "due dates", "last date", "target date",
    "delivery date", "submission date", "cutoff", "cut off", "expiring", "expires",
    "by when", "when is", "when are", "when do", "date",
  ]},
  { canonical: "CUE_NEXT", kind: KIND.CUE, phrases: [
    "next", "soonest", "nearest", "earliest", "immediate", "first", "closest", "what next",
  ]},
  { canonical: "CUE_LATEST", kind: KIND.CUE, phrases: ["latest", "last", "furthest", "farthest", "final"] },
  { canonical: "CUE_HOURS", kind: KIND.CUE, phrases: [
    "hour", "hours", "worked", "tracked", "time spent", "logged", "work diary", "diary",
    "session", "sessions", "timesheet", "clocked", "time", "my time", "time today",
  ]},
  { canonical: "CUE_IDLE", kind: KIND.CUE, phrases: ["idle", "idle time", "inactive time", "away time"] },
  { canonical: "CUE_PRODUCTIVITY", kind: KIND.CUE, phrases: ["productivity", "productive", "efficiency", "utilisation", "utilization"] },
  { canonical: "CUE_SCHEDULE", kind: KIND.CUE, phrases: ["working hours", "work hours", "shift", "schedule", "contracted hours", "roster hours"] },
  { canonical: "CUE_LEAVE", kind: KIND.CUE, phrases: [
    "leave", "leaves", "holiday", "holidays", "vacation", "time off", "day off", "days off",
    "absent", "absence", "off work", "annual leave", "sick leave", "casual leave",
    "am i off", "i am off", "off tomorrow", "off today", "off next week",
  ]},
  { canonical: "CUE_WHO_OUT", kind: KIND.CUE, phrases: [
    "who is on leave", "who all are on leave", "who is off", "who is out", "who all are off",
    "is anyone off", "anyone on leave", "anybody on leave", "who is absent", "who all are absent",
  ]},
  { canonical: "CUE_APPROVAL", kind: KIND.CUE, phrases: [
    "approve", "approval", "approvals", "to approve", "awaiting approval", "pending approval", "queue",
  ]},
  { canonical: "CUE_WORKLOAD", kind: KIND.CUE, phrases: [
    "workload", "busiest", "busy", "loaded", "overloaded", "capacity", "bandwidth",
    "free", "available", "idle people", "who is on", "load",
    "who is working on", "who is doing", "who has", "who is handling", "assignments per person",
  ]},
  { canonical: "CUE_RISK", kind: KIND.CUE, phrases: ["risk", "at risk", "problem", "problems", "trouble", "attention", "worry", "concerns"] },
  { canonical: "CUE_SUMMARY", kind: KIND.CUE, phrases: [
    "summary", "overview", "digest", "brief me", "catch me up", "status update", "where do we stand",
    "how are things", "recap",
  ]},
  { canonical: "CUE_HELP", kind: KIND.CUE, phrases: [
    "help", "what can you", "what can u", "commands", "examples", "how do i", "how to use",
    "hi", "hello", "hey", "salam", "assalam", "good morning", "good evening",
  ]},
  { canonical: "CUE_THANKS", kind: KIND.CUE, phrases: ["thanks", "thank you", "thankyou", "ok thanks", "great", "cool", "bye", "goodbye"] },
  { canonical: "CUE_STATUS_OF", kind: KIND.CUE, phrases: ["status of", "status for", "state of", "progress of", "how is", "how far"] },

  /* ------------------------------- NEGATION ------------------------------ */
  { canonical: "NOT", kind: KIND.NEGATION, phrases: ["not", "no", "without", "except", "excluding", "other than", "apart from", "besides"] },
];

/**
 * Words that carry no routing signal. Stripped before scoring and never treated
 * as a person's name, so "please show me Ahmed tasks" resolves the name Ahmed
 * and not "please".
 */
export const FILLER = new Set([
  "please", "pls", "plz", "kindly", "thanks", "thank", "thanku", "thx", "sir", "madam", "maam",
  "ok", "okay", "just", "actually", "basically", "really", "want", "wants", "wanted", "need", "needs",
  "would", "could", "can", "will", "shall", "should", "may", "might", "must",
  "tell", "told", "know", "let", "get", "got",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "have", "has", "had",
  "and", "or", "but", "so", "then", "than", "that", "this", "these", "those",
  "there", "here", "from", "to", "in", "on", "at", "with", "about", "into", "of", "for", "by",
  "it", "its", "you", "your", "we", "our", "us", "they", "their",
  "much", "right", "now", "currently", "presently", "still", "yet", "any", "some", "all",
  "u", "r", "pl",
  // Interrogatives and pronouns. Without these they survive as "leftovers" and
  // get treated as a person's name — the corpus had "what is Bilal working on"
  // resolving the person as "what".
  "what", "who", "whom", "whose", "which", "when", "where", "why", "how",
  "i", "am", "my", "me", "mine", "myself", "he", "she", "him", "her", "his", "hers",
  "on", "off", "up", "down", "out", "over", "under", "again", "also", "too",
  "give", "show", "list", "find", "look", "check", "share", "send", "provide",
  "working", "work",
  "system", "portal", "app", "database", "record", "records", "data",
]);

/* --------------------- derived indexes (built once) --------------------- */

const PHRASE_INDEX = new Map(); // "in progress" -> { canonical, kind, size }
let MAX_PHRASE = 1;

for (const term of TERMS) {
  for (const phrase of term.phrases) {
    const size = phrase.split(" ").length;
    if (size > MAX_PHRASE) MAX_PHRASE = size;
    // First definition wins, so ordering above encodes precedence.
    if (!PHRASE_INDEX.has(phrase)) {
      PHRASE_INDEX.set(phrase, { canonical: term.canonical, kind: term.kind, size });
    }
  }
}

export { PHRASE_INDEX, MAX_PHRASE };

/** Single-token phrases only — the candidate pool for fuzzy correction. */
export const FUZZY_TARGETS = (() => {
  const out = new Map(); // token -> { canonical, kind }
  for (const [phrase, meta] of PHRASE_INDEX) {
    if (meta.size !== 1) continue;
    if (phrase.length < 3) continue; // "me", "my" are too short to fuzz safely
    out.set(phrase, meta);
  }
  return out;
})();

/**
 * Exact expansions applied before any distance maths. These are the shorthands
 * users actually type; treating them as typos would be slower and less certain.
 */
export const ABBREV = new Map(Object.entries({
  tdy: "today", tmrw: "tomorrow", tmw: "tomorrow", tmrrw: "tomorrow", tomorow: "tomorrow",
  ystrday: "yesterday", yest: "yesterday",
  nxt: "next", wk: "week", wks: "weeks", mth: "month", mnth: "month",
  hw: "how", wat: "what", wht: "what", wats: "what is", whts: "what is",
  jbs: "jobs", jb: "job", tsk: "task", tsks: "tasks", taks: "tasks",
  proj: "project", prj: "project", projs: "projects",
  dl: "deadline", dls: "deadlines",
  wip: "in progress", ttl: "total", cnt: "count", qty: "quantity",
  mngr: "manager", emp: "employee", emps: "employees",
  info: "information", asap: "urgent",
  pending: "pending",
}));

/**
 * Tokens that must never be fuzzy-corrected: each is within edit distance 1 of
 * a real target but means something different. Silently "correcting" these is
 * how a fuzzy matcher starts inventing answers.
 */
export const NEVER_FUZZ = new Set([
  "later", "letter", "lower", "sooner", "leader", "longer", "latest", "tester",
  "house", "mount", "amount", "weak", "night", "right", "light", "might", "sight",
  "load", "road", "read", "lead", "head", "dead", "bead",
  "note", "notes", "node", "code", "mode", "more", "core",
  "hour", "our", "your", "four", "tour", "pour",
  "task", "tasks", "job", "jobs", "project", "projects", "subtask", "subtasks",
  "week", "month", "today", "tomorrow",
  // one edit from "finished"/"closed"/"delivered" but not a status claim
  "finish", "finishing", "close", "closing", "deliver", "delivering", "plate", "late",
]);
