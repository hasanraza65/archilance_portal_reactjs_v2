import { inWindow, dayDiff } from "./dates";

/**
 * Row filters shared by every handler.
 *
 * LAYER DISCRIMINATOR — the single most important rule in the assistant:
 *   parent_task_id == null  ->  UI "Project"
 *   parent_task_id != null  ->  UI "Task"
 * The members feed exposes `parent_task` while the job fan-out exposes
 * `parent_task_id`; either one settles it, so both are checked.
 */

export const isRootTask = (t) =>
  t?.parent_task_id == null && t?.parent_task == null && t?.parentTaskId == null;

export const isChildTask = (t) => !isRootTask(t);

export const isCompleted = (row) =>
  String(row?.task_status ?? row?.status ?? "").toLowerCase() === "completed";

/** "Open" means anything not Completed — the definition used in every answer. */
export const isOpen = (row) => !isCompleted(row);

export const isOverdue = (row) => {
  if (isCompleted(row)) return false;
  const d = dayDiff(row?.due_date);
  return d !== null && d < 0;
};

export function matchesStatus(row, status) {
  if (!status) return true;
  return String(row?.task_status ?? row?.status ?? "").toLowerCase() === String(status).toLowerCase();
}

export function matchesPriority(row, priority) {
  if (!priority) return true;
  return String(row?.priority ?? "").toLowerCase() === String(priority).toLowerCase();
}

export function matchesWindow(row, range) {
  if (!range) return true;
  if (!row?.due_date) return false;
  return inWindow(row.due_date, range);
}

/**
 * Is this row assigned to `userId`?
 *
 * Assignee pivots come back in several shapes depending on the endpoint, so all
 * of them are checked rather than assuming one. Returning false for a row with
 * NO assignee list at all is deliberate: "unknown" must not be counted as
 * "mine", or every unassigned task would land in a personal total.
 */
export function assignedTo(row, userId, key = "assignees") {
  const list = row?.[key];
  if (!Array.isArray(list) || list.length === 0) return false;
  const id = Number(userId);
  return list.some((a) =>
    Number(a?.employee_id) === id ||
    Number(a?.user?.id) === id ||
    Number(a?.user_id) === id ||
    Number(a?.id) === id
  );
}

export function hasNoAssignee(row, key = "assignees") {
  const list = row?.[key];
  return !Array.isArray(list) || list.length === 0;
}

/** Layer filter using the UI's vocabulary. */
export function matchesLayer(row, layer) {
  if (!layer || layer === "ANY") return true;
  if (layer === "PROJECT") return isRootTask(row);
  if (layer === "TASK") return isChildTask(row);
  return true;
}

export function dedupeById(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const id = r?.id;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

/**
 * Total order. Rows without a due date sort last, and `id` breaks ties so the
 * same question always returns the same list — an unstable sort would make the
 * assistant look like it was changing its mind.
 */
export function byDueThenId(a, b) {
  const da = a?.due_date ? dayDiff(a.due_date) : null;
  const db = b?.due_date ? dayDiff(b.due_date) : null;
  if (da === null && db === null) return (a?.id ?? 0) - (b?.id ?? 0);
  if (da === null) return 1;
  if (db === null) return -1;
  if (da !== db) return da - db;
  return (a?.id ?? 0) - (b?.id ?? 0);
}

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };
export function byPriorityThenDue(a, b) {
  const pa = PRIORITY_RANK[String(a?.priority || "").toLowerCase()] ?? 9;
  const pb = PRIORITY_RANK[String(b?.priority || "").toLowerCase()] ?? 9;
  if (pa !== pb) return pa - pb;
  return byDueThenId(a, b);
}
