import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects, fetchProject, fetchJobRootTasks, fetchTaskChildren,
  fetchProjectsWithMembers, updateJob, updateJobStatus, createJob, deleteJob,
} from "@/api/projects";
import { createTask, updateTaskField, deleteTask, setTaskAssignees, updateTaskAttachments } from "@/api/tasks";
import { useAuth } from "@/auth/AuthContext";
import { patchTaskEverywhere, snapshotTaskCaches, restoreTaskCaches, TASK_FIELD_MAP } from "@/lib/taskCache";

export function useJobs({ assignedMe, customerId } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jobs", user?.role, assignedMe, customerId],
    queryFn: () => fetchProjects(user.role, { assignedMe, customerId }),
    enabled: Boolean(user),
  });
}

export function useJobRootTasks(projectId, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-root-tasks", user?.role, projectId],
    queryFn: () => fetchJobRootTasks(user.role, projectId),
    enabled: Boolean(user) && Boolean(projectId) && enabled,
  });
}

export function useTaskChildren(taskId, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["task-children", user?.role, taskId],
    queryFn: () => fetchTaskChildren(user.role, taskId),
    enabled: Boolean(user) && Boolean(taskId) && enabled,
  });
}

/**
 * Cross-project, per-employee task breakdown ("Members View").
 * This is the heaviest query in the app, so it's cached aggressively and served
 * from cache while revalidating — switching to the tab is instant after the
 * first load instead of re-fetching every time.
 */
export function useProjectsWithMembers(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects-with-members", user?.role],
    queryFn: () => fetchProjectsWithMembers(user.role),
    enabled: Boolean(user) && enabled,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Full job detail. `summaryRange` scopes `tasks_hours_summary` — the hours are
 * computed server-side, so a date filter means a re-fetch, and the range is part
 * of the cache key.
 */
export function useJobDetail(projectId, summaryRange = null) {
  const { user } = useAuth();
  const start = summaryRange?.start || null;
  const end = summaryRange?.end || null;
  return useQuery({
    queryKey: ["job-detail", user?.role, projectId, start, end],
    queryFn: () => fetchProject(user.role, projectId, { summaryStart: start, summaryEnd: end }),
    enabled: Boolean(user) && Boolean(projectId),
    // Keep the current job on screen while a new date range loads.
    placeholderData: (prev) => prev,
  });
}

/** Create a job. Note: every id in `employeeIds` gets notified AND emailed. */
export function useCreateJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values) => createJob(user.role, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}

export function useDeleteJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId) => deleteJob(user.role, projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job-detail"] });
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}

/** Update a job's title / description / dates. */
export function useUpdateJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...patch }) => updateJob(user.role, projectId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-detail"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/** Job status uses its own endpoint; completing a job cascades to its tasks. */
export function useUpdateJobStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }) => updateJobStatus(user.role, projectId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-detail"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      // Completing a job marks its tasks Completed server-side.
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
    },
  });
}

/**
 * Single-field task update (status/priority/due date/title/description).
 * Optimistic: the cache is patched immediately (everywhere the task appears —
 * list rows, kanban cards, the open detail panel, its parent's subtask list)
 * so the UI reacts instantly instead of waiting on the round-trip. Rolls back
 * on failure and reconciles with the server in the background either way.
 */
export function useUpdateTaskField() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, field, value }) => updateTaskField(user.role, taskId, field, value),
    onMutate: async ({ taskId, field, value }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["job-root-tasks"] }),
        qc.cancelQueries({ queryKey: ["task-children"] }),
        qc.cancelQueries({ queryKey: ["task-detail"] }),
      ]);
      const snapshot = snapshotTaskCaches(qc);
      const key = TASK_FIELD_MAP[field] || field;
      patchTaskEverywhere(qc, taskId, (t) => ({ ...t, [key]: value }));
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) restoreTaskCaches(qc, context.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
      qc.invalidateQueries({ queryKey: ["job-detail"] });
      qc.invalidateQueries({ queryKey: ["task-detail"] });
      // Members View reads a separate, deeply-nested query (tasks grouped by
      // employee then status) that isn't worth optimistically patching —
      // just refetch it so an edit made there (or elsewhere) stays correct.
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createTask(user.role, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
      // The task-detail panel's subtask list is embedded in this same query
      // (task.sub_tasks) — without invalidating it too, a subtask added from
      // inside the open panel wouldn't appear until the panel was reopened.
      qc.invalidateQueries({ queryKey: ["task-detail"] });
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}

export function useDeleteTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => deleteTask(user.role, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
      qc.invalidateQueries({ queryKey: ["task-detail"] });
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}

/** Add and/or remove task attachments (one multipart round-trip). */
export function useTaskAttachments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, files, deleteIds, taskTitle }) =>
      updateTaskAttachments(user.role, taskId, { files, deleteIds, taskTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-detail"] });
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
      qc.invalidateQueries({ queryKey: ["job-detail"] });
    },
  });
}

/**
 * Replace a task's assignees. `employees` (full {id,name,profile_pic} objects —
 * not just ids) lets this patch the cache optimistically with real avatars
 * instead of going blank until the server responds.
 */
export function useSetTaskAssignees() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, employeeIds }) => setTaskAssignees(user.role, taskId, employeeIds),
    onMutate: async ({ taskId, employees = [] }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["job-root-tasks"] }),
        qc.cancelQueries({ queryKey: ["task-children"] }),
        qc.cancelQueries({ queryKey: ["task-detail"] }),
      ]);
      const snapshot = snapshotTaskCaches(qc);
      const nextAssignees = employees.map((e) => ({ user: e }));
      patchTaskEverywhere(qc, taskId, (t) => ({ ...t, assignees: nextAssignees }));
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) restoreTaskCaches(qc, context.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-children"] });
      qc.invalidateQueries({ queryKey: ["task-detail"] });
      qc.invalidateQueries({ queryKey: ["projects-with-members"] });
    },
  });
}
