import { apiClient } from "./client";
import { ep } from "./endpoint";

/** The employee's own work diary — always self, never takes employee_id. */
export async function fetchMyWorkSessions(role, { page = 1, projectId, taskId, startDate, endDate } = {}) {
  const params = { page };
  if (projectId) params.project_id = projectId;
  if (taskId) params.task_id = taskId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const res = await apiClient.get(ep(role, "/work-session"), { params });
  return res.data;
}

/**
 * An admin/manager/supervisor/executive viewing ANOTHER employee's diary.
 * Admins hit /api/admin/work-session; everyone else (manager/supervisor/
 * executive/outsource) hits /api/employee/other-work-session — matches v1
 * exactly (AdminEmployeeWorkSession.jsx's role-based path split).
 */
export async function fetchEmployeeWorkSessions(viewerRole, employeeId, { page = 1, perPage = 100, projectId, taskId, startDate, endDate } = {}) {
  const path = viewerRole === "admin" ? "/work-session" : "/other-work-session";
  const params = { page, per_page: perPage, employee_id: employeeId };
  if (projectId) params.project_id = projectId;
  if (taskId) params.task_id = taskId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const res = await apiClient.get(ep(viewerRole, path), { params });
  return res.data;
}

export async function createManualTime(role, { taskId, startDate, startTime, endDate, endTime, memo, proofPdf }) {
  const form = new FormData();
  form.append("task_id", taskId);
  form.append("start_date", startDate);
  form.append("start_time", startTime);
  form.append("end_date", endDate);
  form.append("end_time", endTime);
  form.append("memo_content", memo || "");
  if (proofPdf) form.append("proof_pdf", proofPdf);
  const res = await apiClient.post(ep(role, "/manual-time"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteWorkSession(role, sessionId) {
  const res = await apiClient.delete(ep(role, `/work-session/${sessionId}`));
  return res.data;
}

export async function deleteScreenshot(role, screenshotId) {
  const res = await apiClient.delete(ep(role, `/screenshot/${screenshotId}`));
  return res.data;
}

/**
 * Screenshots an employee has deleted from a session (soft-deleted server
 * side). Admin-only — always hits the admin path directly since the button
 * that triggers this is only ever shown to admins (see docs/deleted-screenshots-flow.md).
 */
export async function fetchDeletedScreenshots(sessionId) {
  const res = await apiClient.get(ep("admin", `/deleted-screenshots/${sessionId}`));
  return res.data;
}

/**
 * 30-second activity snapshots for one work session.
 *
 * Response is `{ status, message, data: [...] }` — a FLAT array, never a
 * paginator. Reading `data.data` here silently yielded [] and the panel showed
 * "No activity logs recorded" even when the session had hundreds of rows.
 * The paginated fallback is only a guard in case the endpoint ever changes.
 */
export async function fetchActivityLogs(role, sessionId) {
  const res = await apiClient.get(ep(role, `/fetch-activity-logs/${sessionId}`));
  const payload = res.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}
