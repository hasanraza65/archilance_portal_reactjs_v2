import { isCompletedStatus } from "./statusMeta";

/**
 * Non-blocking "feels intelligent" nudge: when every child of a parent task is
 * Completed but the parent itself isn't, suggest completing the parent too.
 * Returns null when there's nothing worth suggesting (no false positives on
 * empty children, and never re-suggests once the parent is already Completed).
 */
export function computeParentSyncSuggestion(parentTask, children) {
  if (!parentTask || !Array.isArray(children) || children.length === 0) return null;
  if (isCompletedStatus(parentTask.task_status)) return null;
  const allDone = children.every((c) => isCompletedStatus(c.task_status));
  if (!allDone) return null;
  return {
    kind: "complete-parent",
    parentId: parentTask.id,
    parentTitle: parentTask.task_title,
    message: `All ${children.length} subtask${children.length > 1 ? "s" : ""} are done — mark "${parentTask.task_title}" as Completed too?`,
  };
}
