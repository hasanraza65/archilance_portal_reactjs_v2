import { capabilitiesFor } from "./data/capabilities";
import { sources, attempt } from "./data/sources";
import { buildUniverse, scopeToPerson, scopeToMe } from "./data/universe";
import { resolveWindow, dayDiff, relativeDue, formatDay } from "./logic/dates";
import {
  isOpen, isCompleted, isOverdue, matchesStatus, matchesPriority, matchesWindow,
  matchesLayer, isRootTask, byDueThenId, byPriorityThenDue, hasNoAssignee, assignedTo,
} from "./logic/predicates";
import {
  answerCount, answerList, answerBreakdown, answerRefusal, answerClarify,
  nounFor, taskItem, jobItem, personItem,
} from "./answer/render";
import { formatDuration } from "@/lib/format";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
// Same maths the Work Diary page uses, so the two can never disagree.
import { aggregateWindowsActivity } from "@/lib/productivity";
import { idleSecondsForSession } from "@/features/workDiary/useWorkDiaryData";

/**
 * Intent -> answer.
 *
 * Fixed order of operations, and each step exists because skipping it produced
 * a wrong answer in the audit:
 *   1. capabilities   — what may this account read at all
 *   2. resolve names  — a candidate span becomes a real person / job, or is dropped
 *   3. capability gate— refuse rather than return 0 for something we can't read
 *   4. build universe — the rows, plus how complete they are
 *   5. handle         — filter and count
 *   6. render         — count first, UI vocabulary, coverage stated
 */
export async function run(parsed, { user, role, queryClient }) {
  const caps = capabilitiesFor(user);
  const ctx = { user, role, qc: queryClient, caps };
  const { intent, slots } = parsed;

  if (caps.orphaned) {
    return answerRefusal(
      "Your account type doesn't have API access for this data yet — an admin needs to look at the role setup. I'd rather say that than show you a zero."
    );
  }

  // Genuinely ambiguous input gets ONE short question instead of a confident
  // guess. parse() flags this when the winning intent is below the confidence
  // floor, or beats the runner-up by less than the margin floor.
  const clarification = clarifyFor(parsed, ctx);
  if (clarification) return clarification;

  try {
    return await route(intent, slots, ctx, parsed);
  } catch (err) {
    const cls = err?.__assistant ? err : null;
    if (cls) return answerRefusal(cls.message);
    throw err;
  }
}

/* -------------------------------- clarify -------------------------------- */

/** Short, human labels for the intents a user might have meant. */
const INTENT_LABEL = {
  "deadlines.due": "What's due",
  "deadlines.overdue": "What's overdue",
  "deadlines.next": "My next deadline",
  "deadlines.latest": "The furthest deadline",
  "deadlines.upcoming": "What's coming up",
  "deadlines.risk": "What needs attention",
  "count.jobs": "Count the Jobs",
  "count.projects": "Count the Projects",
  "count.tasks": "Count the Tasks",
  "count.open": "Count open work",
  "count.by_status": "Break down by status",
  "count.by_priority": "Break down by priority",
  "list.work": "Show me the work",
  "entity.lookup": "Look that up",
  "hours.tracked": "Time I tracked",
  "hours.last_session": "My last session",
  "count.people": "Head count",
  "hours.schedule": "My working hours",
  "leaves.mine": "My leave",
  "leaves.queue": "Leave to approve",
  "team.workload": "Who's busiest",
  "team.free": "Who has capacity",
  "summary.overview": "Give me an overview",
};

/** Canonical phrasing for each intent, sent as the chip payload. */
const INTENT_PROMPT = {
  "deadlines.due": "what is due today",
  "deadlines.overdue": "what is overdue",
  "deadlines.next": "my next deadline",
  "deadlines.latest": "my latest deadline",
  "deadlines.upcoming": "what is coming up",
  "deadlines.risk": "what needs attention",
  "count.jobs": "how many jobs",
  "count.projects": "how many projects",
  "count.tasks": "how many tasks",
  "count.open": "how many open items",
  "count.by_status": "break down by status",
  "count.by_priority": "break down by priority",
  "list.work": "show my open work",
  "entity.lookup": "show my open work",
  "hours.tracked": "how many hours did i work this week",
  "hours.last_session": "my last work session",
  "count.people": "how many employees do we have",
  "hours.schedule": "my working hours",
  "leaves.mine": "my leaves",
  "leaves.queue": "leave requests to approve",
  "team.workload": "who is busiest",
  "team.free": "who has capacity",
  "summary.overview": "give me an overview",
};

/**
 * Returns a clarify answer, or null to proceed.
 *
 * Deliberately conservative: a wrong guess is worse than one extra tap, but a
 * question on every input would be exhausting. It only fires when the parser
 * genuinely couldn't separate two readings, or understood nothing at all.
 */
function clarifyFor(parsed, ctx) {
  const { intent, ambiguous, alternatives = [] } = parsed;
  if (!ambiguous) return null;
  // "hi"/"thanks" is a greeting and gets the help text. Landing on `help`
  // because NOTHING was understood is the opposite case and must ask.
  const greeted = parsed?.debug?.spans?.some(
    (x) => x.canonical === "CUE_HELP" || x.canonical === "CUE_THANKS"
  );
  if (intent === "help" && greeted) return null;

  const legal = alternatives
    .map((a) => a.id)
    .filter((id) => INTENT_LABEL[id] && isLegalIntent(id, ctx))
    .slice(0, 3);

  // Nothing recognisable at all — offer the common starting points.
  if (legal.length === 0) {
    return answerClarify("I didn't quite catch that. Did you mean one of these?", [
      { label: "What's due today", payload: "what is due today" },
      { label: "What's overdue", payload: "what is overdue" },
      { label: "Show my open work", payload: "show my open work" },
    ]);
  }

  // One clear survivor after the legality filter — just answer it.
  if (legal.length === 1) return null;

  return answerClarify("I could read that two ways — which did you mean?",
    legal.map((id) => ({ label: INTENT_LABEL[id], payload: INTENT_PROMPT[id] })));
}

/** Don't offer a choice the account can't actually use. */
function isLegalIntent(id, ctx) {
  const c = ctx.caps;
  if (id === "team.workload" || id === "team.free") return c.canSeeOthers;
  if (id === "leaves.queue") return c.sources.leaveQueue;
  if (id === "leaves.mine") return c.sources.myLeave;
  if (id === "hours.tracked" || id === "hours.schedule") return c.sources.hours;
  return true;
}

async function route(intent, slots, ctx, parsed) {
  switch (intent) {
    case "deadlines.due":
    case "deadlines.overdue":
    case "deadlines.upcoming":
    case "deadlines.next":
    case "deadlines.latest":
    case "deadlines.risk":
      return deadlines(intent, slots, ctx);

    case "count.jobs": return countJobs(slots, ctx);
    case "count.projects": return countLayer("PROJECT", slots, ctx);
    case "count.tasks": return countLayer("TASK", slots, ctx);
    case "count.open": return countOpen(slots, ctx);
    case "count.by_status": return breakdown("status", slots, ctx);
    case "count.by_priority": return breakdown("priority", slots, ctx);

    case "list.work": return listWork(slots, ctx);
    case "entity.lookup": return entityLookup(slots, ctx, parsed);

    case "hours.tracked": return hoursTracked(slots, ctx, parsed);
    case "hours.last_session": return lastSession(slots, ctx);
    case "hours.schedule": return workingHours(slots, ctx);
    case "count.people": return countPeople(slots, ctx);

    case "leaves.mine": return myLeave(ctx);
    case "leaves.queue": return leaveQueue(ctx);

    case "team.workload":
    case "team.free":
      return workload(intent, slots, ctx);

    case "summary.overview": return overview(ctx);

    case "help":
    default:
      return help(ctx);
  }
}

/* ---------------------------- scope resolution --------------------------- */

/**
 * Turns slots.scope into a concrete filter.
 *
 * A candidate name is checked against the visible roster FIRST and the job list
 * second. A name matching neither is DROPPED — the question is answered without
 * it rather than filtered down to nothing, which is what the old substring
 * matcher did.
 */
async function resolveScope(slots, ctx, universe) {
  const scope = slots.scope || {};

  if (scope.kind === "team") {
    if (!ctx.caps.canSeeOthers) {
      return { kind: "me", label: "assigned to you", forced: true, note: "You can only see your own work, so I've answered for you." };
    }
    return { kind: "team", label: ctx.caps.peerNote ? "across the people you manage" : "across the team" };
  }

  if (scope.kind === "unassigned") return { kind: "unassigned", label: "with nobody assigned" };
  if (scope.kind === "me") return { kind: "me", label: "assigned to you" };

  if (scope.kind === "candidate" && scope.text) {
    if (!ctx.caps.canSeeOthers) {
      return { kind: "me", label: "assigned to you", forced: true, note: "You can only see your own work, so I've answered for you." };
    }

    // Resolve against the FULL roster first, then decide on visibility. Doing
    // it the other way round let "Manager E" fall through to a prefix match on
    // the only visible "Manager..." row and silently answer for the wrong
    // person — the exact confusion the peer rule exists to prevent.
    const matches = await matchRoster(ctx, scope.text);
    if (matches.length === 1) {
      const hit = matches[0];
      if (!ctx.caps.peerFilter(hit)) {
        return {
          kind: "refuse",
          message: `${hit.name} is a ${hit.employee_type || "peer"} — ${ctx.caps.peerNote || "that's outside what you can see here."}`,
        };
      }
      return { kind: "person", personId: hit.id, label: `assigned to ${hit.name}` };
    }
    if (matches.length > 1) {
      const visible = matches.filter(ctx.caps.peerFilter);
      if (visible.length === 1) {
        return { kind: "person", personId: visible[0].id, label: `assigned to ${visible[0].name}` };
      }
      if (visible.length > 1) {
        return { kind: "ambiguous", options: visible.slice(0, 3), text: scope.text };
      }
      return {
        kind: "refuse",
        message: `Everyone matching "${scope.text}" is a manager or executive — ${ctx.caps.peerNote || "that's outside what you can see here."}`,
      };
    }

    const job = await findJob(ctx, scope.text);
    if (job) return { kind: "job", jobId: job.id, jobName: job.project_name, label: `in ${job.project_name}` };

    // Matched nothing — ignore it rather than filter everything away.
    return { kind: ctx.caps.canSeeOthers ? "all" : "me", label: "", droppedName: scope.text };
  }

  // Nothing said. Managers/admins default to everything they can see; an
  // individual contributor defaults to their own work.
  return ctx.caps.canSeeOthers
    ? { kind: "all", label: "" }
    : { kind: "me", label: "assigned to you" };
}

/**
 * Everyone in the roster whose name the span could plausibly mean, strongest
 * rule first. Returns ALL matches at the best tier so the caller can tell
 * "one person" from "several" — guessing between them is how you answer for
 * the wrong employee.
 */
async function matchRoster(ctx, text) {
  if (!ctx.caps.sources.members) return [];
  const [members] = await attempt(() => sources.members(ctx));
  if (!Array.isArray(members)) return [];

  const q = String(text).toLowerCase().trim();
  if (!q) return [];

  const name = (p) => String(p?.name || "").toLowerCase().trim();
  const tiers = [
    members.filter((p) => name(p) === q),                                   // full name
    members.filter((p) => name(p).split(/\s+/)[0] === q),                   // first name
    members.filter((p) => name(p).split(/\s+/).includes(q)),                // any name part
    members.filter((p) => q.length >= 4 && name(p).startsWith(q)),           // prefix, but only a real one
  ];
  for (const tier of tiers) if (tier.length > 0) return tier;
  return [];
}

async function findJob(ctx, text) {
  const [jobs] = await attempt(() => sources.jobs(ctx));
  if (!jobs) return null;
  const q = String(text).toLowerCase().trim();
  return (
    jobs.find((j) => j.project_name?.toLowerCase() === q) ||
    jobs.find((j) => j.project_name?.toLowerCase().includes(q)) ||
    null
  );
}

/**
 * The members feed only contains user_role 3 accounts. If the asker is not in
 * it (admin, role-6 supervisor) a "me"-scoped answer from that universe is a
 * structural zero — not a real one. Rebuild from the job fan-out, whose root
 * tasks DO carry the assignee pivot, and answer honestly from that.
 */
async function ensureMineVisible(universe, scope, ctx) {
  if (scope.kind !== "me") return universe;
  if (universe.sourceId !== "members") return universe;
  if (universe.peopleById?.has(Number(ctx.user?.id))) return universe;
  return buildUniverse(ctx, { forceFanout: true });
}

function applyScope(universe, scope, ctx) {
  if (scope.kind === "me") return scopeToMe(universe, ctx);
  if (scope.kind === "person") return scopeToPerson(universe, scope.personId);
  if (scope.kind === "unassigned") {
    return { ...universe, tasks: universe.tasks.filter((t) => hasNoAssignee(t)) };
  }
  if (scope.kind === "job") {
    return { ...universe, tasks: universe.tasks.filter((t) => Number(t.project_id ?? t.project?.id) === Number(scope.jobId)) };
  }
  return universe;
}

/** Common filter chain shared by deadline / list / count handlers. */
function applyFilters(rows, slots, { forceOpen = true } = {}) {
  const range = resolveWindow(slots.time, slots.timeDate, slots.timeDays, slots.timeUnitLabel);
  let out = rows;
  if (slots.layer && slots.layer !== "ANY") out = out.filter((t) => matchesLayer(t, slots.layer));
  if (slots.status) out = out.filter((t) => matchesStatus(t, slots.status));
  if (slots.priority) out = out.filter((t) => matchesPriority(t, slots.priority));
  if (range) out = out.filter((t) => matchesWindow(t, range));
  // Unless the user explicitly asked about finished work, they mean outstanding.
  if (forceOpen && !slots.status) out = out.filter(isOpen);
  else if (forceOpen && slots.status && !isCompletedStatusName(slots.status)) out = out.filter(isOpen);
  return { rows: out, range };
}

const isCompletedStatusName = (s) => String(s || "").toLowerCase() === "completed";

/**
 * Turns a non-actionable scope into the answer for it: a refusal when the peer
 * rule forbids it, or ONE short question when several people match the name.
 * Returns null when the scope is usable.
 */
function scopeBlock(scope) {
  if (scope.kind === "refuse") return answerRefusal(scope.message);
  if (scope.kind === "ambiguous") {
    return answerClarify(
      `There are a few people matching "${scope.text}" — which one?`,
      scope.options.map((p) => ({ label: p.name, payload: `show open work for ${p.name}` }))
    );
  }
  return null;
}

/* -------------------------------- handlers ------------------------------- */

async function deadlines(intent, slots, ctx) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);

  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;
  universe = await ensureMineVisible(universe, scope, ctx);
  const scoped = applyScope(universe, scope, ctx);

  const effective = { ...slots };
  if (intent === "deadlines.overdue") effective.time = "overdue";
  if (intent === "deadlines.upcoming" && !effective.time) effective.time = "upcoming";
  if ((intent === "deadlines.next" || intent === "deadlines.latest") && !effective.time) effective.time = "upcoming";

  const { rows, range } = applyFilters(scoped.tasks, effective);
  const withDates = rows.filter((t) => t.due_date);

  if (intent === "deadlines.next" || intent === "deadlines.latest") {
    if (withDates.length === 0) {
      return { text: `Nothing with a due date ${scope.label || ""} right now.`.replace(/\s+/g, " ") };
    }
    const sorted = [...withDates].sort(byDueThenId);
    const pick = intent === "deadlines.next" ? sorted[0] : sorted[sorted.length - 1];
    const when = intent === "deadlines.next" ? "next deadline" : "furthest-out deadline";
    return {
      text: `Your ${when} is **${pick.task_title}** — ${relativeDue(pick.due_date)} (${formatDay(pick.due_date)}).`,
      coverageNote: universe.coverage.exact ? universe.coverage.note : universe.coverage.note,
      items: [taskItem(pick)],
      link: { label: "Open Jobs", to: "/jobs" },
    };
  }

  if (intent === "deadlines.risk") {
    const overdue = rows.filter(isOverdue);
    const today = rows.filter((t) => dayDiff(t.due_date) === 0);
    const urgent = rows.filter((t) => String(t.priority || "").toLowerCase() === "urgent");
    const total = new Set([...overdue, ...today, ...urgent].map((t) => t.id)).size;
    if (total === 0) return { text: "Nothing looks at risk — no overdue work, nothing due today, no urgent items. 🎉" };
    return answerBreakdown({
      buckets: { Overdue: overdue.length, "Due today": today.length, Urgent: urgent.length },
      coverage: universe.coverage,
      title: "Needs attention",
      link: { label: "Open Jobs", to: "/jobs" },
    });
  }

  const sorted = [...withDates].sort(byDueThenId);
  const label = range?.label || "with a due date";

  if (slots.aggregate === "COUNT") {
    return answerCount({
      value: sorted.length,
      coverage: universe.coverage,
      noun: (n) => nounFor(slots.layer, n),
      qualifier: label,
      scopeLabel: scope.label,
      link: { label: "Open Jobs", to: "/jobs" },
      items: sorted.map(taskItem),
    });
  }

  return answerList({
    rows: sorted.map(taskItem),
    coverage: universe.coverage,
    noun: (n) => nounFor(slots.layer, n),
    qualifier: label,
    scopeLabel: scope.label,
    link: { label: "Open Jobs", to: "/jobs" },
    emptyText: `Nothing ${label} ${scope.label || ""}. 🎉`.replace(/\s+/g, " "),
  });
}

async function countJobs(slots, ctx) {
  // Server-computed total wherever one exists — never count a list.
  const [stats] = await attempt(() => sources.stats(ctx));
  const [jobs, jobsErr] = await attempt(() => sources.jobs(ctx));

  if (!jobs && !stats) return answerRefusal(jobsErr?.message || "I couldn't read your jobs.");

  let rows = jobs || [];
  if (slots.status) rows = rows.filter((j) => matchesStatus(j, slots.status));
  const range = resolveWindow(slots.time, slots.timeDate, slots.timeDays, slots.timeUnitLabel);
  if (range) rows = rows.filter((j) => matchesWindow(j, range));

  const filtered = Boolean(slots.status || range);

  // Unfiltered "how many jobs" prefers the exact server count.
  if (!filtered && stats?.jobs != null) {
    return answerCount({
      value: stats.jobs,
      coverage: { exact: true },
      noun: (n) => nounFor("JOB", n),
      link: { label: "Open Jobs", to: "/jobs" },
    });
  }

  return answerCount({
    value: rows.length,
    coverage: { exact: true },
    noun: (n) => nounFor("JOB", n),
    qualifier: [slots.status, range?.label].filter(Boolean).join(" "),
    link: { label: "Open Jobs", to: "/jobs" },
    items: rows.map(jobItem),
  });
}

async function countLayer(layer, slots, ctx) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);

  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;
  universe = await ensureMineVisible(universe, scope, ctx);
  const scoped = applyScope(universe, scope, ctx);

  // The fan-out source can only see root tasks, so it cannot answer "how many
  // Tasks" at all. Say so rather than report a number that means something else.
  if (layer === "TASK" && universe.rootOnly) {
    return answerRefusal(
      "I can't get an exact Task count for your account — the source I can read only returns Projects, not the Tasks inside them.",
      { label: "Open Jobs", to: "/jobs" }
    );
  }

  const { rows } = applyFilters(scoped.tasks, { ...slots, layer }, { forceOpen: false });
  const open = rows.filter(isOpen);

  return answerCount({
    value: rows.length,
    coverage: universe.coverage,
    noun: (n) => nounFor(layer, n),
    scopeLabel: scope.label,
    link: { label: "Open Jobs", to: "/jobs" },
    items: [...open].sort(byDueThenId).map(taskItem),
  });
}

async function countOpen(slots, ctx) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);
  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;
  universe = await ensureMineVisible(universe, scope, ctx);
  const scoped = applyScope(universe, scope, ctx);

  const { rows } = applyFilters(scoped.tasks, slots);
  return answerCount({
    value: rows.length,
    coverage: universe.coverage,
    noun: (n) => `open ${nounFor(slots.layer, n)}`,
    scopeLabel: scope.label,
    link: { label: "Open Jobs", to: "/jobs" },
    items: [...rows].sort(byDueThenId).map(taskItem),
  });
}

async function breakdown(dimension, slots, ctx) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);
  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;
  universe = await ensureMineVisible(universe, scope, ctx);
  const scoped = applyScope(universe, scope, ctx);

  // A single named status/priority is a count, not a breakdown.
  const single = dimension === "status" ? slots.status : slots.priority;
  const { rows } = applyFilters(scoped.tasks, { ...slots, status: null, priority: null }, { forceOpen: false });

  if (single) {
    const match = rows.filter((t) => (dimension === "status" ? matchesStatus(t, single) : matchesPriority(t, single)));
    return answerCount({
      value: match.length,
      coverage: universe.coverage,
      noun: (n) => nounFor(slots.layer, n),
      qualifier: dimension === "status" ? single : `${single}-priority`,
      scopeLabel: scope.label,
      link: { label: "Open Jobs", to: "/jobs" },
      items: [...match].sort(byDueThenId).map(taskItem),
    });
  }

  const buckets = {};
  if (dimension === "status") {
    for (const opt of STATUS_OPTIONS) buckets[opt.label] = 0;
    for (const t of rows) {
      const key = STATUS_OPTIONS.find((o) => o.value.toLowerCase() === String(t.task_status || "").toLowerCase())?.label
        || t.task_status || "Unknown";
      buckets[key] = (buckets[key] || 0) + 1;
    }
  } else {
    for (const p of ["Urgent", "High", "Normal", "Low"]) buckets[p] = 0;
    let none = 0;
    for (const t of rows) {
      const p = String(t.priority || "").trim();
      if (!p) { none += 1; continue; }
      const key = ["Urgent", "High", "Normal", "Low"].find((x) => x.toLowerCase() === p.toLowerCase()) || p;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    if (none > 0) buckets["No priority set"] = none;
  }

  return answerBreakdown({
    buckets,
    coverage: universe.coverage,
    title: dimension === "status" ? `Work by status ${scope.label}`.trim() : `Work by priority ${scope.label}`.trim(),
    link: { label: "Open Jobs", to: "/jobs" },
  });
}

async function listWork(slots, ctx) {
  // "show my jobs" is about Jobs, which don't live in the task universe.
  if (slots.layer === "JOB") return listJobs(slots, ctx);

  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);
  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;
  universe = await ensureMineVisible(universe, scope, ctx);
  const scoped = applyScope(universe, scope, ctx);

  const { rows, range } = applyFilters(scoped.tasks, slots);
  const sorted = [...rows].sort(slots.priority ? byPriorityThenDue : byDueThenId);

  const qualifier = [
    slots.priority ? slots.priority.toLowerCase() : null,
    slots.status || (slots.open ? "open" : null),
    range?.label,
  ].filter(Boolean).join(" ");

  const answer = answerList({
    rows: sorted.map(taskItem),
    coverage: universe.coverage,
    noun: (n) => nounFor(slots.layer, n),
    qualifier,
    scopeLabel: scope.label,
    link: { label: "Open Jobs", to: "/jobs" },
    emptyText: `No ${qualifier || "open"} work ${scope.label || ""}. 🎉`.replace(/\s+/g, " "),
  });
  if (scope.note) answer.coverageNote = [answer.coverageNote, scope.note].filter(Boolean).join(" ");
  if (scope.droppedName) {
    answer.coverageNote = [answer.coverageNote, `I couldn't find anyone or any job called "${scope.droppedName}", so I ignored that part.`]
      .filter(Boolean).join(" ");
  }
  return answer;
}

async function listJobs(slots, ctx) {
  const [jobs, err] = await attempt(() => sources.jobs(ctx));
  if (!jobs) return answerRefusal(err?.message || "I couldn't read your jobs.");

  let rows = jobs;
  if (slots.status) rows = rows.filter((j) => matchesStatus(j, slots.status));
  else rows = rows.filter((j) => !isCompleted(j));
  const range = resolveWindow(slots.time, slots.timeDate, slots.timeDays, slots.timeUnitLabel);
  if (range) rows = rows.filter((j) => matchesWindow(j, range));

  rows = [...rows].sort(byDueThenId);
  return answerList({
    rows: rows.map(jobItem),
    coverage: { exact: true },
    noun: (n) => nounFor("JOB", n),
    qualifier: [slots.status, range?.label].filter(Boolean).join(" "),
    link: { label: "Open Jobs", to: "/jobs" },
    emptyText: "No jobs match that. 🎉",
  });
}

async function entityLookup(slots, ctx, parsed) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);

  const scope = await resolveScope(slots, ctx, universe);
  const blocked = scopeBlock(scope);
  if (blocked) return blocked;

  // A person -> answer as a scoped list. A job -> summarise that job.
  if (scope.kind === "person" || scope.kind === "me") return listWork(slots, ctx);

  if (scope.kind === "job") {
    const scoped = applyScope(universe, scope, ctx);
    const { rows } = applyFilters(scoped.tasks, slots);
    const [jobs] = await attempt(() => sources.jobs(ctx));
    const job = jobs?.find((j) => Number(j.id) === Number(scope.jobId));

    const head = job
      ? `**${job.project_name}** — ${job.status}${job.due_date ? `, ${relativeDue(job.due_date)}` : ""}.`
      : `**${scope.jobName}**:`;

    if (rows.length === 0) {
      return { text: `${head} No open work in it right now.`, link: { label: "Open job", to: `/jobs/${scope.jobId}` } };
    }
    const sorted = [...rows].sort(byDueThenId);
    return {
      text: `${head} **${sorted.length}** open ${nounFor(slots.layer, sorted.length)}:`,
      coverageNote: universe.coverage.exact ? null : universe.coverage.note,
      items: sorted.slice(0, 10).map(taskItem),
      more: Math.max(0, sorted.length - 10),
      link: { label: "Open job", to: `/jobs/${scope.jobId}` },
    };
  }

  // Name matched nothing — offer the closest options rather than inventing one.
  const name = slots.scope?.text;
  return answerClarify(
    `I couldn't find anyone or any job called "${name}". Did you mean one of these?`,
    [
      { label: "My open work", payload: "show my open tasks" },
      { label: "What's due today", payload: "what is due today" },
      { label: "All jobs", payload: "show my jobs" },
    ]
  );
}

/**
 * Tracked time, idle time and productivity — all three come from the same work
 * diary fetch, so the question just decides which number leads.
 *
 * Uses exactly the same maths as the Work Diary page (idleSecondsForSession +
 * aggregateWindowsActivity) so the assistant and the page can never disagree.
 */
async function hoursTracked(slots, ctx, parsed) {
  if (!ctx.caps.sources.hours) {
    return answerRefusal("Time tracking isn't available for your account type.", { label: "Open Jobs", to: "/jobs" });
  }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const { startDate, label } = hoursRange(slots, today, iso);

  // "how many hours did Mahil work" / "open the work diary of Mahil" — resolve
  // the person, honour the peer rule, and read THEIR diary, not the asker's.
  const person = await resolveDiaryPerson(slots, ctx);
  if (person?.refusal) return person.refusal;

  const [data, err] = person
    ? await attempt(() => sources.employeeSessions(ctx, person.id, { startDate, endDate: iso(today) }))
    : await attempt(() => sources.workSessions(ctx, { startDate, endDate: iso(today) }));
  if (!data) return answerRefusal(err?.message || "I couldn't read that work diary.");

  const first = person ? person.name.split(" ")[0] : null;
  const diaryLink = person
    ? { label: `Open ${first}'s Work Diary`, to: `/work-diary/${person.id}` }
    : { label: "Open Work Diary", to: "/work-diary" };
  const who = first || "You";
  const whoWas = first ? `${first} was` : "You were";

  const list = data?.data || [];
  if (list.length === 0) {
    return {
      text: first ? `No tracked time from ${first} ${label}.` : `No tracked time ${label}.`,
      link: diaryLink,
    };
  }

  const worked = list.reduce((s, x) => s + Math.max(0, x?.raw_calculation?.net_seconds || 0), 0);
  const idle = list.reduce((s, x) => s + idleSecondsForSession(x), 0);
  const agg = aggregateWindowsActivity(data?.windows_activity || [], worked);

  // Which figure the user actually asked for.
  const wantsIdle = askedFor(parsed, "CUE_IDLE");
  const wantsProductivity = askedFor(parsed, "CUE_PRODUCTIVITY");

  if (wantsIdle) {
    return {
      text: `${whoWas} idle for **${formatDuration(idle)}** ${label}, out of ${formatDuration(worked + idle)} logged.`,
      coverageNote: "Idle time is excluded from worked hours, so it isn't billed.",
      link: diaryLink,
    };
  }

  if (wantsProductivity) {
    if (!agg.apps?.length) {
      return {
        text: `${who} tracked **${formatDuration(worked)}** ${label}, but there's no app-activity data to score productivity from.`,
        link: diaryLink,
      };
    }
    const top = agg.apps.slice(0, 3).map((a) => `${a.name} (${formatDuration(a.duration)})`).join(", ");
    return {
      text: `Productivity ${label}: **${agg.productivePercent}%** — about ${formatDuration(agg.productiveSeconds)} of ${formatDuration(worked)} productive.\nTop apps: ${top}.`,
      link: diaryLink,
    };
  }

  const extras = [
    idle > 0 ? `${formatDuration(idle)} idle` : null,
    agg.productivePercent ? `${agg.productivePercent}% productive` : null,
  ].filter(Boolean).join(" · ");

  return {
    text: `${who} tracked **${formatDuration(worked)}** across **${list.length}** session${list.length === 1 ? "" : "s"} ${label}${extras ? `.\n${extras}` : "."}`,
    link: diaryLink,
  };
}

/**
 * Resolves a named person for a diary question. Returns null for "myself",
 * {id, name} for a visible person, or {refusal} when the peer rule says no.
 */
async function resolveDiaryPerson(slots, ctx) {
  const scope = slots.scope || {};
  if (scope.kind !== "candidate" || !scope.text) return null;
  // Check the name against the roster FIRST — a stray leftover word ("much",
  // "time") must not trigger a refusal for a question that was about yourself.
  const matches = await matchRoster(ctx, scope.text);
  if (matches.length === 0) return null; // not a person — answer for the asker
  if (!ctx.caps.canSeeOthers && !matches.some((m) => Number(m.id) === Number(ctx.user?.id))) {
    return { refusal: answerRefusal("You can only see your own work diary.", { label: "Open Work Diary", to: "/work-diary" }) };
  }
  if (!ctx.caps.canSeeOthers) return null; // they named themselves
  const visible = matches.filter(ctx.caps.peerFilter);
  if (visible.length === 0) {
    return {
      refusal: answerRefusal(
        `${matches[0].name} is a ${matches[0].employee_type || "peer"} — ${ctx.caps.peerNote || "that's outside what you can see here."}`
      ),
    };
  }
  const p = visible[0];
  return { id: p.id, name: p.name };
}

/** "my last work session" — when did this person last track anything. */
async function lastSession(slots, ctx) {
  if (!ctx.caps.sources.hours) {
    return answerRefusal("Time tracking isn't available for your account type.");
  }
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 89); // 90-day lookback

  const person = await resolveDiaryPerson(slots, ctx);
  if (person?.refusal) return person.refusal;
  const first = person ? person.name.split(" ")[0] : null;
  const link = person
    ? { label: `Open ${first}'s Work Diary`, to: `/work-diary/${person.id}` }
    : { label: "Open Work Diary", to: "/work-diary" };

  const [data, err] = person
    ? await attempt(() => sources.employeeSessions(ctx, person.id, { startDate: iso(start), endDate: iso(today) }))
    : await attempt(() => sources.workSessions(ctx, { startDate: iso(start), endDate: iso(today) }));
  if (!data) return answerRefusal(err?.message || "I couldn't read that work diary.");

  const list = (data?.data || []).filter((x) => x?.start_date);
  if (list.length === 0) {
    return { text: `${first ? `${first} has` : "You have"} no tracked sessions in the last 90 days.`, link };
  }

  const latest = [...list].sort((a, b) =>
    `${b.start_date}T${b.start_time || "00:00:00"}`.localeCompare(`${a.start_date}T${a.start_time || "00:00:00"}`)
  )[0];
  const worked = Math.max(0, latest?.raw_calculation?.net_seconds || 0);
  const running = !latest.end_date && !latest.end_time;

  return {
    text: `${first ? `${first}'s` : "Your"} last tracked session was **${formatDay(latest.start_date)}**${running ? " — still running" : worked ? ` (${formatDuration(worked)} worked)` : ""}.`,
    link,
  };
}

/** "how many employees / customers / users do we have" — real head counts. */
async function countPeople(slots, ctx) {
  const subject = slots.people;
  const nounMap = {
    EMPLOYEES: (n) => (n === 1 ? "employee" : "employees"),
    CUSTOMERS: (n) => (n === 1 ? "customer" : "customers"),
    USERS: (n) => (n === 1 ? "user" : "users"),
  };

  // Admin & role-6 supervisor: exact server-side COUNT(*) from the dashboard.
  const [stats] = await attempt(() => sources.stats(ctx));
  if (stats?.people) {
    const value = subject === "EMPLOYEES" ? stats.people.employees
      : subject === "CUSTOMERS" ? stats.people.customers
      : stats.people.users;
    if (value != null) {
      return answerCount({
        value,
        coverage: { exact: true },
        noun: nounMap[subject],
        scopeLabel: "in the system",
        link: subject === "CUSTOMERS" ? { label: "Open Customers", to: "/customers" } : { label: "Open Employees", to: "/employees" },
      });
    }
  }

  // Managers/executives: count the roster they can see, and say so.
  if (subject === "EMPLOYEES" && ctx.caps.canSeeOthers && ctx.caps.sources.members) {
    const [members] = await attempt(() => sources.members(ctx));
    if (Array.isArray(members)) {
      const visible = members.filter(ctx.caps.peerFilter);
      return answerCount({
        value: visible.length,
        coverage: { exact: true, note: ctx.caps.peerNote },
        noun: nounMap.EMPLOYEES,
        scopeLabel: ctx.caps.peerNote ? "that you can see" : "in the system",
        link: { label: "Open Employees", to: "/employees" },
      });
    }
  }

  return answerRefusal("Head counts are available to admins and managers.");
}

/** Maps the parsed time window onto a diary date range. */
function hoursRange(slots, today, iso) {
  const start = new Date(today);
  switch (slots.time) {
    case "today":      return { startDate: iso(today), label: "today" };
    case "yesterday": {
      start.setDate(today.getDate() - 1);
      return { startDate: iso(start), label: "yesterday" };
    }
    // "last 3 months", "past 10 days" — the number came from the sentence.
    case "past_n": {
      const days = Math.max(1, Math.min(365, slots.timeDays || 7));
      start.setDate(today.getDate() - (days - 1));
      return { startDate: iso(start), label: `in the last ${slots.timeUnitLabel || `${days} days`}` };
    }
    case "past_month":
    case "this_month":
    case "next_month": {
      start.setDate(today.getDate() - 29);
      return { startDate: iso(start), label: "in the last 30 days" };
    }
    case "past_week":
    default: {
      start.setDate(today.getDate() - 6);
      return { startDate: iso(start), label: "in the last 7 days" };
    }
  }
}

/** Did the sentence actually contain this cue? Reads the parser's spans. */
function askedFor(parsed, canonical) {
  return Boolean(parsed?.debug?.spans?.some((s) => s.canonical === canonical));
}

/** Contracted working-hour slots for the asker. */
async function workingHours(slots, ctx) {
  if (!ctx.caps.sources.hours) {
    return answerRefusal("Working hours aren't available for your account type.");
  }
  const [slotsList, err] = await attempt(() => sources.workingHours(ctx, ctx.user?.id));
  if (!slotsList) return answerRefusal(err?.message || "I couldn't read your working hours.");

  if (slotsList.length === 0) {
    return {
      text: "No working hours are set on your profile yet.",
      link: { label: "Open Work Diary", to: "/work-diary" },
    };
  }

  const fmt = (t) => {
    if (!t) return "?";
    const [h, m] = String(t).split(":");
    const d = new Date();
    d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const totalMinutes = slotsList.reduce((sum, s) => {
    const [sh, sm] = String(s.start_time || "0:0").split(":").map(Number);
    const [eh, em] = String(s.end_time || "0:0").split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // a slot running past midnight
    return sum + Math.max(0, mins);
  }, 0);

  const lines = slotsList.map((s) => `• ${fmt(s.start_time)} – ${fmt(s.end_time)}`).join("\n");
  return {
    text: `Your working hours — **${formatDuration(totalMinutes * 60)}** a day across ${slotsList.length} slot${slotsList.length === 1 ? "" : "s"}:\n${lines}`,
    link: { label: "Open Work Diary", to: "/work-diary" },
  };
}

async function myLeave(ctx) {
  if (!ctx.caps.sources.myLeave) return answerRefusal("Leave requests aren't available for your account type.");
  const [list, err] = await attempt(() => sources.myLeave(ctx));
  if (!list) return answerRefusal(err?.message || "I couldn't read your leave requests.");
  if (list.length === 0) {
    return { text: "You haven't submitted any leave requests.", link: { label: "Apply for leave", to: "/my-leaves" } };
  }
  const pending = list.filter((l) => l.status === "Pending").length;
  const approved = list.filter((l) => l.status === "Approved").length;
  const rejected = list.filter((l) => l.status === "Rejected").length;
  return {
    text: `**${list.length}** leave request${list.length === 1 ? "" : "s"} — ${approved} approved, ${pending} pending${rejected ? `, ${rejected} rejected` : ""}.`,
    items: list.slice(0, 6).map((l) => ({
      id: l.id,
      title: `${l.leave_type || "Leave"}`,
      meta: `${formatDay(l.start_date)} – ${formatDay(l.end_date)}`,
      status: l.status,
      link: "/my-leaves",
    })),
    link: { label: "Open My Leaves", to: "/my-leaves" },
  };
}

async function leaveQueue(ctx) {
  if (!ctx.caps.sources.leaveQueue) {
    return answerRefusal("Only admins and managers can see the team's leave.", { label: "My leaves", to: "/my-leaves" });
  }
  const [res, err] = await attempt(() => sources.leaveQueue(ctx));
  if (!res) return answerRefusal(err?.message || "I couldn't read the leave queue.");
  const pending = (res.items || []).filter((l) => l.status === "Pending");
  if (pending.length === 0) {
    return { text: "No leave requests waiting on you. 🎉", link: { label: "Open Staff Leaves", to: "/leaves" } };
  }
  return {
    text: `**${pending.length}** leave request${pending.length === 1 ? "" : "s"} awaiting a decision:`,
    coverageNote: ctx.caps.peerNote,
    items: pending.slice(0, 8).map((l) => ({
      id: l.id,
      title: l.user?.name || "Employee",
      meta: `${l.leave_type || "Leave"} · ${formatDay(l.start_date)} – ${formatDay(l.end_date)}`,
      status: l.status,
      link: "/leaves",
    })),
    link: { label: "Open Staff Leaves", to: "/leaves" },
  };
}

async function workload(intent, slots, ctx) {
  if (!ctx.caps.canSeeOthers) {
    return answerRefusal("Team workload is available to admins, managers and executives.");
  }
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);

  const people = [...(universe.peopleById?.values() || [])];
  if (people.length === 0) return answerRefusal("I couldn't read the team's workload.");

  const counts = new Map(people.map((p) => [Number(p.id), 0]));
  for (const t of universe.tasks) {
    if (!isOpen(t)) continue;
    const owner = Number(t.__ownerId);
    if (counts.has(owner)) counts.set(owner, counts.get(owner) + 1);
  }

  const ranked = people
    .map((p) => ({ ...p, open: counts.get(Number(p.id)) ?? 0 }))
    .sort((a, b) => (intent === "team.free" ? a.open - b.open : b.open - a.open))
    .slice(0, 8);

  const title = intent === "team.free"
    ? "Most capacity first"
    : "Busiest first";

  return {
    text: `${title} — open work per person:`,
    coverageNote: ctx.caps.peerNote,
    items: ranked.map((p) => personItem(p, `${p.open} open item${p.open === 1 ? "" : "s"}`)),
    link: { label: "Open Jobs", to: "/jobs" },
  };
}

async function overview(ctx) {
  let universe = await buildUniverse(ctx, { people: true });
  if (universe.error) return answerRefusal(universe.error.message);
  const scope = ctx.caps.canSeeOthers ? { kind: "all", label: "" } : { kind: "me", label: "assigned to you" };
  const scoped = applyScope(universe, scope, ctx);
  const open = scoped.tasks.filter(isOpen);

  const overdue = open.filter(isOverdue).length;
  const today = open.filter((t) => dayDiff(t.due_date) === 0).length;
  const week = open.filter((t) => { const d = dayDiff(t.due_date); return d !== null && d > 0 && d <= 7; }).length;
  const urgent = open.filter((t) => String(t.priority || "").toLowerCase() === "urgent").length;

  const [stats] = await attempt(() => sources.stats(ctx));

  const lines = [
    stats?.jobs != null ? `• Jobs — **${stats.jobs}**` : null,
    `• Open work — **${universe.coverage.exact ? open.length : `at least ${open.length}`}**`,
    overdue ? `• Overdue — **${overdue}**` : null,
    today ? `• Due today — **${today}**` : null,
    week ? `• Due in the next 7 days — **${week}**` : null,
    urgent ? `• Urgent — **${urgent}**` : null,
  ].filter(Boolean).join("\n");

  return {
    text: `Here's where things stand:\n${lines}`,
    coverageNote: universe.coverage.exact ? null : universe.coverage.note,
    link: { label: "Open Jobs", to: "/jobs" },
  };
}

function help(ctx) {
  const first = ctx.user?.name?.split(" ")[0] || "there";
  return {
    text: `Hi ${first} 👋 Ask me about **deadlines**, **counts**, **your work**, **hours**, **leave** or **the team**. Try "what's due today", "how many jobs", or "what's overdue".`,
    isHelp: true,
  };
}

export { capabilitiesFor };
