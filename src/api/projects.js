import { apiClient } from "./client";
import { ep } from "./endpoint";

/** Normalizes the list response: either a plain array, {data:[]}, or grouped-by-status object. */
function normalizeProjectList(payload) {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw).flat();
  return [];
}

export async function fetchProjects(role, { assignedMe, customerId } = {}) {
  const params = {};
  if (assignedMe) params.assigned_me = 1;
  if (customerId) params.customer_id = customerId;
  const res = await apiClient.get(ep(role, "/project"), { params });
  return normalizeProjectList(res.data);
}

export async function fetchProject(role, projectId, { light = false, summaryStart, summaryEnd } = {}) {
  const params = {};
  if (light) params.light = 1;
  if (summaryStart) params.summary_start_date = summaryStart;
  if (summaryEnd) params.summary_end_date = summaryEnd;
  const res = await apiClient.get(ep(role, `/project/${projectId}`), { params });
  return res.data?.data ?? res.data;
}

/** Top-level tasks for a job (parent_task_id === null), for the list-tree root. */
export async function fetchJobRootTasks(role, projectId) {
  const res = await apiClient.get(ep(role, "/project-task"), { params: { project_id: projectId } });
  const raw = res.data?.data ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

/** One level of children for a task node (lazy expand). */
export async function fetchTaskChildren(role, taskId) {
  const res = await apiClient.get(ep(role, `/project-task/${taskId}`));
  const data = res.data?.data ?? res.data;
  return data?.sub_tasks || data?.subTasks || [];
}

/**
 * Cross-project, per-employee task breakdown ("Members View").
 *
 * Available to admin, supervisor (role 6) AND every user_role 3 account: the
 * employee route sits OUTSIDE the employeeType:Executive group
 * (routes/api.php:387, group closes at :384). The old assistant assumed it was
 * manager-only and pushed plain employees onto a truncated fan-out instead.
 *
 * Returns ALL employees (backend filters user_role = 3) each with their
 * assigned tasks at BOTH layers, unpaginated. `light=1` adds employee_type,
 * which the assistant needs to enforce peer visibility.
 *
 * `light=1` is an opt-in slimming param: it drops the duplicated flat
 * `assignedTasks` array (every task already appears under tasks_by_status) and
 * trims user/task rows to the fields this view renders — a large payload cut.
 * Older backends simply ignore the param and return the full response, which
 * this view also handles, so it degrades gracefully.
 */
export async function fetchProjectsWithMembers(role, { statuses, employeeId, peerScope = false } = {}) {
  const params = { light: 1 };
  if (statuses?.length) params.statuses = statuses.join(",");
  if (employeeId) params.employee_id = employeeId;
  // Opt-in server-side peer visibility (ProjectController::peerHiddenUserIds).
  // Omitted by default so the Members view — and every already-deployed client —
  // keeps its current behaviour. The assistant sends it.
  if (peerScope) params.peer_scope = 1;
  const res = await apiClient.get(ep(role, "/projects-with-members"), { params });
  return res.data || [];
}

/**
 * Create a job.
 *
 * Two things to be careful with:
 *  - `employee_ids` MUST be present. The backend does `count($request->employee_ids)`
 *    with no guard, so a missing key is a 500 on PHP 8 — send [] to create
 *    a job with nobody on it.
 *  - Every id in `employee_ids` gets an in-app notification AND an assignment
 *    EMAIL, immediately. Assigning people here is not a silent operation.
 */
export async function createJob(role, { projectName, projectDescription, startDate, dueDate, customerId, employeeIds = [] }) {
  const body = {
    project_name: projectName,
    project_description: projectDescription || null,
    start_date: startDate || null,
    due_date: dueDate || null,
    customer_id: customerId || null,
    status: "Backlog",
    employee_ids: employeeIds,
  };
  const res = await apiClient.post(ep(role, "/project"), body);
  return res.data?.project ?? res.data;
}

/**
 * Delete a job. NOTE: this is a HARD delete. The projects table has a
 * deleted_at column but app/Models/Project.php does not use the SoftDeletes
 * trait, so the row is really gone.
 */
export async function deleteJob(role, projectId) {
  const res = await apiClient.delete(ep(role, `/project/${projectId}`));
  return res.data;
}

/**
 * Update a job's own fields (title / description / dates).
 *
 * NOTE: status is deliberately NOT sent here — the backend's update() validator
 * only accepts `In Progress,Pending,Completed,Cancelled`, so the app's real
 * statuses (Backlog, Awaiting Info, In-house review, Client Review) would be
 * rejected. Status goes through updateJobStatus() below instead.
 */
export async function updateJob(role, projectId, { projectName, projectDescription, dueDate, startDate }) {
  const body = { id: projectId };
  if (projectName !== undefined) body.project_name = projectName;
  if (projectDescription !== undefined) body.project_description = projectDescription;
  if (dueDate !== undefined) body.due_date = dueDate || null;
  if (startDate !== undefined) body.start_date = startDate || null;
  const res = await apiClient.put(ep(role, `/project/${projectId}`), body);
  return res.data?.project ?? res.data;
}

/** Status has its own endpoint (and cascades to tasks when set to Completed). */
export async function updateJobStatus(role, projectId, status) {
  const res = await apiClient.post(ep(role, "/update-project-status"), {
    project_id: projectId,
    status,
  });
  return res.data;
}

export async function updateProjectAssignees(role, projectId, employeeIds) {
  const res = await apiClient.post(ep(role, "/update-project-assignees"), {
    project_id: projectId,
    employee_ids: employeeIds,
  });
  return res.data;
}

/**
 * Flattens one API row from `/projects-with-tasks` into a single task row.
 *
 * The backend returns `{ project, task, sub_task? }` per row: `task` is always
 * the root task for context (title/id, plus its full `sub_tasks` for the
 * expand affordance), and `sub_task` is present only when the matched row is
 * actually a subtask — in which case `sub_task` (not `task`) is the row to
 * render, matching v1's TaskList.jsx `formatTaskItem` exactly.
 */
function normalizeCrossJobTaskRow(item) {
  const task = item.sub_task || item.task;
  return {
    ...task,
    id: task.id,
    projectId: item.project?.id ?? null,
    projectName: item.project?.project_name || null,
    parentTaskId: item.task?.id ?? null,
    parentTaskTitle: item.task?.task_title || null,
    isSubtask: Boolean(item.sub_task),
    subTasks: item.task?.sub_tasks || [],
  };
}

/**
 * Cross-job flat task list ("Projects" tab in Jobs — v1's TaskList.jsx).
 * Fetched one status bucket at a time via `task_status` + `page`, exactly
 * like v1: the backend groups jobs into one flat, paginated task stream
 * rather than nesting them under each job.
 */
export async function fetchProjectsWithTasks(role, { status, page = 1, assignedMe } = {}) {
  const params = { page };
  if (status) params.task_status = status;
  if (assignedMe) params.assigned_me = 1;
  const res = await apiClient.get(ep(role, "/projects-with-tasks"), { params });
  const payload = res.data;
  const rawItems = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return {
    items: rawItems.map(normalizeCrossJobTaskRow),
    total: payload?.total ?? rawItems.length,
    currentPage: payload?.current_page ?? page,
    lastPage: payload?.last_page ?? 1,
  };
}


/**
 * EVERY task, root and child, unpaginated — the only endpoint that gives an
 * exact task total without fanning out over jobs.
 *
 * employee prefix only (routes/api.php:407). The backend scopes it to the
 * caller's own assignments when employee_type is exactly "Employee"; every
 * other sub-type receives the whole org's tasks. Callers must therefore treat
 * the scope as "depends on employee_type", not "mine".
 */
export async function fetchAllProjectTasks(role) {
  const res = await apiClient.get(ep(role, "/all-project-tasks"));
  const raw = res.data?.data ?? res.data;
  return Array.isArray(raw) ? raw : [];
}
