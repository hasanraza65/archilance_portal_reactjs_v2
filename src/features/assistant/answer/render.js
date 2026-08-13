import { formatDay, relativeDue } from "../logic/dates";
import { isRootTask } from "../logic/predicates";

/**
 * Answer formatting.
 *
 * Two hard rules:
 *  1. UI VOCABULARY ONLY. A user never sees "root task", "parent_task_id" or
 *     "the projects table" — they see Job, Project and Task.
 *  2. NEVER STATE A TOTAL WE DIDN'T MEASURE. Anything built on a partial read
 *     is phrased as a floor ("at least 12") and carries the coverage note.
 */

const MAX_ROWS = 10;

/** UI noun for a layer, correctly pluralised. */
export function nounFor(layer, n) {
  const one = n === 1;
  switch (layer) {
    case "JOB": return one ? "Job" : "Jobs";
    case "PROJECT": return one ? "Project" : "Projects";
    case "TASK": return one ? "Task" : "Tasks";
    default: return one ? "item" : "items";
  }
}

/** A task row -> the shape AssistantWidget renders. */
export function taskItem(t) {
  const jobName = t.__job?.project_name || t.project?.project_name || null;
  const parent = t.parent_task?.task_title || null;
  const meta = [
    t.__ownerName,
    jobName,
    parent ? `in ${parent}` : null,
    t.due_date ? relativeDue(t.due_date) : null,
  ].filter(Boolean).join(" · ");

  return {
    id: t.id,
    title: t.task_title || "Untitled",
    meta,
    status: t.task_status,
    priority: t.priority,
    link: `/jobs/task/${t.id}`,
    kind: isRootTask(t) ? "PROJECT" : "TASK",
  };
}

export function jobItem(j) {
  return {
    id: `job-${j.id}`,
    title: j.project_name || "Untitled job",
    meta: [j.customer?.name, j.due_date ? relativeDue(j.due_date) : null].filter(Boolean).join(" · "),
    status: j.status,
    link: `/jobs/${j.id}`,
    kind: "JOB",
  };
}

export function personItem(p, subtitle) {
  return { id: `person-${p.id}`, title: p.name, meta: subtitle, link: `/work-diary/${p.id}`, kind: "PERSON" };
}

/**
 * A counted answer. `coverage.exact === false` turns "12" into "at least 12"
 * and appends the note — that phrasing difference is the whole point.
 */
export function answerCount({ value, coverage, noun, qualifier = "", scopeLabel = "", link, items }) {
  const n = value;
  const word = typeof noun === "function" ? noun(n) : noun;
  const prefix = coverage?.exact ? `**${n}**` : `**at least ${n}**`;
  const parts = [prefix, qualifier, word, scopeLabel].filter(Boolean).join(" ");
  return {
    text: `${parts}.`.replace(/\s+\./, "."),
    coverageNote: coverage?.exact ? coverage.note || null : coverage?.note || null,
    items: items?.slice(0, MAX_ROWS),
    more: items ? Math.max(0, items.length - MAX_ROWS) : 0,
    link,
  };
}

/** A listed answer — count first, then the rows. */
export function answerList({ rows, coverage, noun, qualifier = "", scopeLabel = "", link, emptyText }) {
  const n = rows.length;
  if (n === 0) {
    return { text: emptyText || `Nothing matches that${scopeLabel ? ` ${scopeLabel}` : ""}. 🎉`, coverageNote: coverage?.exact ? null : coverage?.note || null };
  }
  const word = typeof noun === "function" ? noun(n) : noun;
  const prefix = coverage?.exact ? `**${n}**` : `**at least ${n}**`;
  const head = [prefix, qualifier, word, scopeLabel].filter(Boolean).join(" ");
  return {
    text: `${head}:`.replace(/\s+:/, ":"),
    coverageNote: coverage?.exact ? coverage.note || null : coverage?.note || null,
    items: rows.slice(0, MAX_ROWS),
    more: Math.max(0, n - MAX_ROWS),
    link,
  };
}

/** A status/priority breakdown. */
export function answerBreakdown({ buckets, coverage, title, link }) {
  const entries = Object.entries(buckets).filter(([, v]) => v > 0);
  if (entries.length === 0) return { text: `Nothing to break down — no matching work. 🎉` };
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const lines = entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `• ${k} — **${v}**`)
    .join("\n");
  return {
    text: `${title} (**${coverage?.exact ? total : `at least ${total}`}** in total):\n${lines}`,
    coverageNote: coverage?.exact ? coverage.note || null : coverage?.note || null,
    link,
  };
}

/** A refusal. Deliberately never phrased as "you have none". */
export function answerRefusal(message, link) {
  return { text: message, link, isRefusal: true };
}

/** One short question with tappable options, used when confidence is low. */
export function answerClarify(question, options) {
  return { text: question, clarify: options, isHelp: false };
}

export { formatDay };
