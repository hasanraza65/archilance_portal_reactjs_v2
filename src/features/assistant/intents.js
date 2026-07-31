/**
 * Rule-based intent parser for the built-in assistant.
 *
 * Deliberately NOT an LLM: it scores each intent by keyword/synonym hits against
 * the user's phrasing, picks the best match above a threshold, and extracts a
 * few structured slots (time window, status, priority, person scope). Everything
 * runs locally and instantly — no external service, no API key, no cost.
 */

const norm = (s) => String(s || "").toLowerCase().replace(/[^\w\s@]/g, " ").replace(/\s+/g, " ").trim();

/* -------------------------------- Slots -------------------------------- */

export const TIME_WINDOWS = {
  overdue: ["overdue", "over due", "late", "past due", "missed deadline", "behind"],
  today: ["today", "due today", "todays", "for today"],
  tomorrow: ["tomorrow", "next day"],
  week: ["this week", "week", "weekly", "next 7 days", "coming week", "7 days"],
  month: ["this month", "month", "monthly", "30 days"],
};

const STATUS_WORDS = {
  "In Progress": ["in progress", "progress", "ongoing", "working on", "active"],
  Completed: ["completed", "complete", "done", "finished"],
  Backlog: ["backlog", "not started", "todo", "to do"],
  "On Hold": ["on hold", "hold", "paused", "blocked"],
  "Awaiting Info": ["awaiting info", "awaiting", "waiting info", "waiting"],
  "In-house review": ["in-house review", "in house review", "internal review"],
  "Client Review": ["client review", "customer review"],
};

const PRIORITY_WORDS = {
  Urgent: ["urgent", "critical", "asap", "emergency"],
  High: ["high priority", "high"],
  Normal: ["normal priority", "normal", "medium"],
  Low: ["low priority", "low"],
};

function detect(text, table) {
  const t = norm(text);
  let best = null;
  let bestLen = 0;
  for (const [key, words] of Object.entries(table)) {
    for (const w of words) {
      if (t.includes(w) && w.length > bestLen) {
        best = key;
        bestLen = w.length;
      }
    }
  }
  return best;
}

export const detectTimeWindow = (text) => detect(text, TIME_WINDOWS);
export const detectStatus = (text) => detect(text, STATUS_WORDS);
export const detectPriority = (text) => detect(text, PRIORITY_WORDS);

/** "assigned to me" / "my tasks" vs. someone else / everyone. */
export function detectScope(text) {
  const t = norm(text);
  if (/\b(my|me|mine|i have|assigned to me|i am assigned)\b/.test(t)) return "me";
  if (/\b(team|everyone|all members|everybody|staff)\b/.test(t)) return "team";
  const named = t.match(/(?:for|of|by|assigned to)\s+([a-z]+(?:\s+[a-z]+)?)/);
  if (named && !["me", "my", "team", "today", "this"].includes(named[1])) return named[1];
  return null;
}

/* ------------------------------- Intents ------------------------------- */

/**
 * IMPORTANT — the product's vocabulary differs from the database's:
 *   backend `projects` table          -> called "Jobs"     in the UI
 *   root task (parent_task_id = null) -> called "Projects" in the UI
 *   child task (has parent_task_id)   -> called "Tasks"    in the UI
 * The intents below use the UI's words, and the runner maps them to the right
 * layer, so "show my projects" returns root tasks — not the projects table.
 */
export const INTENTS = [
  {
    id: "my_tasks",
    label: "My tasks",
    keywords: ["task", "tasks", "subtask", "subtasks", "assigned", "assign", "todo", "my work"],
    negative: ["job", "jobs", "chat", "leave", "diary", "hour"],
  },
  {
    id: "my_projects",
    label: "My projects",
    keywords: ["project", "projects"],
    negative: ["job", "jobs"],
  },
  {
    id: "my_jobs",
    label: "My jobs",
    keywords: ["job", "jobs", "client", "client work"],
    negative: ["task", "subtask", "project"],
  },
  {
    id: "due_tasks",
    label: "Deadlines",
    keywords: ["due", "deadline", "deadlines", "overdue", "late", "expiring", "by when"],
  },
  {
    id: "urgent_tasks",
    label: "Urgent work",
    keywords: ["urgent", "critical", "priority", "important", "asap", "emergency"],
  },
  {
    id: "my_hours",
    label: "My hours",
    keywords: ["hour", "hours", "time", "worked", "tracked", "productivity", "diary", "session", "idle"],
  },
  {
    id: "my_leaves",
    label: "My leaves",
    keywords: ["leave", "leaves", "holiday", "vacation", "time off", "absent", "day off"],
  },
  {
    id: "team_overview",
    label: "Team overview",
    keywords: ["team", "members", "everyone", "who is", "who's", "employees", "staff", "workload"],
  },
  {
    id: "help",
    label: "Help",
    keywords: ["help", "what can you", "how do", "commands", "examples", "hi", "hello", "hey"],
  },
];

/**
 * Scores every intent against the phrase and returns the winner.
 * Returns { intent, confidence, slots } — falls back to `help` when nothing
 * scores above the threshold, so the bot always responds usefully.
 */
export function parseIntent(text) {
  const t = norm(text);
  const words = new Set(t.split(" "));

  let best = { intent: "help", score: 0 };
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (kw.includes(" ") ? t.includes(kw) : words.has(kw)) score += kw.length > 4 ? 2 : 1.5;
    }
    for (const neg of intent.negative || []) {
      if (words.has(neg)) score -= 1.5;
    }
    if (score > best.score) best = { intent: intent.id, score };
  }

  const slots = {
    time: detectTimeWindow(text),
    status: detectStatus(text),
    priority: detectPriority(text),
    scope: detectScope(text),
  };

  // A bare time/priority phrase ("anything due today?") still means tasks.
  if (best.score === 0 && (slots.time || slots.priority)) {
    best = { intent: slots.priority ? "urgent_tasks" : "due_tasks", score: 1 };
  }

  return { intent: best.intent, confidence: best.score, slots };
}

/** Suggested prompts shown when the assistant opens. */
export const SUGGESTIONS = [
  "Show my tasks",
  "What's due today?",
  "Tasks due this week",
  "Show overdue tasks",
  "My urgent tasks",
  "Show my projects",
  "Show my jobs",
  "How many hours did I work this week?",
  "My leaves",
];
