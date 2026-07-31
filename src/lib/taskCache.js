// Patches a task by id wherever it might be cached — job-root-tasks lists,
// task-children lists, and inside task-detail (both the task itself and its
// embedded sub_tasks array) — so an edit shows up EVERYWHERE instantly instead
// of waiting for a refetch. Used for optimistic updates (status/priority/due
// date/assignees) so the UI never feels like it's waiting on the network.

function patchArray(arr, taskId, patchFn) {
  if (!Array.isArray(arr)) return arr;
  let changed = false;
  const next = arr.map((t) => {
    if (t.id === taskId) {
      changed = true;
      return patchFn(t);
    }
    return t;
  });
  return changed ? next : arr;
}

export function patchTaskEverywhere(qc, taskId, patchFn) {
  qc.getQueryCache()
    .findAll({ queryKey: ["job-root-tasks"] })
    .forEach((query) => qc.setQueryData(query.queryKey, (old) => patchArray(old, taskId, patchFn)));

  qc.getQueryCache()
    .findAll({ queryKey: ["task-children"] })
    .forEach((query) => qc.setQueryData(query.queryKey, (old) => patchArray(old, taskId, patchFn)));

  qc.getQueryCache()
    .findAll({ queryKey: ["task-detail"] })
    .forEach((query) =>
      qc.setQueryData(query.queryKey, (old) => {
        if (!old) return old;
        let next = old;
        if (old.id === taskId) next = patchFn(old);
        if (Array.isArray(old.sub_tasks)) {
          const patchedSubs = patchArray(old.sub_tasks, taskId, patchFn);
          if (patchedSubs !== old.sub_tasks) next = { ...next, sub_tasks: patchedSubs };
        }
        return next;
      })
    );
}

/** Snapshots every cache this optimistic update touches, for rollback on error. */
export function snapshotTaskCaches(qc) {
  return [
    ...qc.getQueryCache().findAll({ queryKey: ["job-root-tasks"] }),
    ...qc.getQueryCache().findAll({ queryKey: ["task-children"] }),
    ...qc.getQueryCache().findAll({ queryKey: ["task-detail"] }),
  ].map((query) => [query.queryKey, query.state.data]);
}

export function restoreTaskCaches(qc, snapshot) {
  snapshot.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
}

/** field name (as used by updateTaskField) -> the object key it lives under. */
export const TASK_FIELD_MAP = {
  status: "task_status",
  priority: "priority",
  dueDate: "due_date",
  description: "task_description",
  title: "task_title",
};
