import { sources, attempt } from "./sources";
import { dedupeById, assignedTo, isRootTask } from "../logic/predicates";

/**
 * Builds the set of rows a question is answered from, and — just as important —
 * an honest statement of how complete that set is.
 *
 * THE RULE: every number the assistant says carries a coverage record. If the
 * data is complete we say the number plainly. If it is not, we say what we
 * actually know ("at least 40 — I could only read 15 of your 62 jobs") instead
 * of stating a confident wrong total. The old assistant had no such concept,
 * which is why it answered "3 projects" from a list truncated at 15 jobs.
 */

export const exact = (note = null) => ({ exact: true, note });
export const partial = ({ scanned, total, unit, reason }) => ({
  exact: false,
  scanned,
  total,
  unit,
  reason,
  note: total
    ? `I could only read ${scanned} of ${total} ${unit}, so this is a floor, not a total.`
    : `This is a partial read (${reason}), so treat it as a floor.`,
});

/** Hard ceiling on the per-job fan-out. Only used when no bulk source is legal. */
const FAN_OUT_LIMIT = 25;

/**
 * @returns {{ tasks, jobs, coverage, sourceId, peopleById }}
 *
 * Source preference, best first:
 *   1. members feed   — all assignees, both layers, unpaginated, carries
 *                       employee_type so peer visibility can be applied
 *   2. all-project-tasks — every task in one call (employee prefix only)
 *   3. per-job fan-out   — last resort, and always reported as partial
 */
export async function buildUniverse(ctx, need = {}) {
  const { caps } = ctx;

  // ---- 1. members feed -------------------------------------------------
  // Skipped when the caller has discovered the feed cannot answer for THIS
  // person (an admin's own rows are absent from it - it only lists role 3).
  if (caps.sources.members && !need.forceFanout) {
    const [members, err] = await attempt(() => sources.members(ctx));
    if (members && Array.isArray(members)) {
      const visible = members.filter(caps.peerFilter);
      const tasks = [];
      const peopleById = new Map();

      for (const m of visible) {
        peopleById.set(Number(m.id), {
          id: m.id, name: m.name, email: m.email,
          employee_type: m.employee_type, openCount: m.total_tasks ?? 0,
        });
        for (const bucket of Object.values(m.tasks_by_status || {})) {
          for (const t of bucket?.tasks || []) tasks.push({ ...t, __ownerId: m.id, __ownerName: m.name });
        }
      }

      const hiddenCount = members.length - visible.length;
      return {
        tasks: dedupeById(tasks),
        jobs: null,
        peopleById,
        sourceId: "members",
        coverage: exact(hiddenCount > 0 ? caps.peerNote : null),
        hiddenPeople: hiddenCount,
      };
    }
    if (err && err.kind === "forbidden") {
      // Fall through — another source may still be legal.
    }
  }

  // ---- 2. all-project-tasks -------------------------------------------
  if (caps.sources.allTasks && !need.forceFanout) {
    const [all, err] = await attempt(() => sources.allTasks(ctx));
    if (all && Array.isArray(all)) {
      return {
        tasks: dedupeById(all),
        jobs: null,
        peopleById: new Map(),
        sourceId: "all-tasks",
        // The backend scopes this by employee_type, so it is exact for what it
        // is allowed to return — but it is NOT necessarily "mine".
        coverage: exact(),
        serverScoped: true,
      };
    }
    if (err && err.kind !== "forbidden") return failed(err);
  }

  // ---- 3. per-job fan-out (partial by construction) --------------------
  const [jobs, jobErr] = await attempt(() => sources.jobs(ctx));
  if (!jobs) return failed(jobErr);

  const ordered = orderForTruncation(jobs);
  const slice = ordered.slice(0, FAN_OUT_LIMIT);
  const lists = await Promise.all(
    slice.map((j) =>
      sources.rootTasksForJob(ctx, j.id)
        .then((rows) => rows.map((t) => ({ ...t, __job: j })))
        .catch(() => [])
    )
  );

  const tasks = dedupeById(lists.flat());
  return {
    tasks,
    jobs,
    peopleById: new Map(),
    sourceId: "fan-out",
    coverage: jobs.length > slice.length
      ? partial({ scanned: slice.length, total: jobs.length, unit: "jobs", reason: "no bulk task source for this account" })
      : // Even a complete fan-out only sees ROOT tasks, never sub-tasks.
        partial({ scanned: slice.length, total: jobs.length, unit: "jobs", reason: "this source returns Projects only, not their Tasks" }),
    rootOnly: true,
  };
}

function failed(err) {
  return { tasks: [], jobs: null, peopleById: new Map(), sourceId: "none", coverage: exact(), error: err };
}

/**
 * When we can't read everything, read the jobs most likely to matter first —
 * soonest due date, then most recently touched. A truncated answer built from
 * the RIGHT rows is far more useful than one built from an arbitrary 25.
 */
function orderForTruncation(jobs) {
  return [...jobs].sort((a, b) => {
    const ad = a?.due_date ? Date.parse(a.due_date) : Infinity;
    const bd = b?.due_date ? Date.parse(b.due_date) : Infinity;
    if (ad !== bd) return ad - bd;
    const au = a?.updated_at ? Date.parse(a.updated_at) : 0;
    const bu = b?.updated_at ? Date.parse(b.updated_at) : 0;
    return bu - au;
  });
}

/** Narrows a universe to one person, honouring the peer filter already applied. */
export function scopeToPerson(universe, personId) {
  const id = Number(personId);
  const tasks = universe.tasks.filter(
    (t) => Number(t.__ownerId) === id || assignedTo(t, id)
  );
  return { ...universe, tasks };
}

/** Narrows to the asker. */
export function scopeToMe(universe, ctx) {
  return scopeToPerson(universe, ctx.user?.id);
}

export { isRootTask };
