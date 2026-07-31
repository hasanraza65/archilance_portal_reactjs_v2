import { apiClient } from "./client";
import { ep } from "./endpoint";
import { TASK_FIELD_MAP } from "@/lib/taskCache";

export async function fetchTaskDetail(role, taskId) {
  const res = await apiClient.get(ep(role, `/project-task/${taskId}`));
  return res.data?.data ?? res.data;
}

/** Create a task or sub-task. `attachments` is an array of File objects. */
export async function createTask(role, { projectId, parentTaskId, title, description, dueDate, employeeIds = [], attachments = [] }) {
  const form = new FormData();
  form.append("task_title", title);
  form.append("task_description", description || "");
  form.append("project_id", projectId);
  form.append("task_status", "Backlog");
  if (parentTaskId) form.append("parent_task_id", parentTaskId);
  if (dueDate) form.append("due_date", dueDate);
  employeeIds.forEach((id) => form.append("employee_ids[]", id));
  attachments.forEach((file, i) => form.append(`attachments[${i}]`, file));

  const res = await apiClient.post(ep(role, "/project-task"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
}

/** Single-field quick update (status/priority/due date/description) — matches
 *  v1's inline-edit pattern exactly: PUT with just the one changed field. */
export async function updateTaskField(role, taskId, field, value) {
  const bodyKey = TASK_FIELD_MAP[field] || field;
  const res = await apiClient.put(ep(role, `/project-task/${taskId}`), { [bodyKey]: value });
  return res.data?.data ?? res.data;
}

/**
 * Add and/or remove task attachments.
 *
 * There is no dedicated attachment endpoint — both operations ride on the task
 * update, so this is a multipart PUT (method-spoofed, because PHP won't parse a
 * multipart body on a real PUT). `task_title` is resent because the validator
 * marks it `sometimes|required`: omitting it is fine, but sending an empty one
 * would fail, so we only include it when we have it.
 */
export async function updateTaskAttachments(role, taskId, { files = [], deleteIds = [], taskTitle } = {}) {
  const form = new FormData();
  form.append("_method", "put");
  if (taskTitle) form.append("task_title", taskTitle);
  files.forEach((file, i) => form.append(`attachments[${i}]`, file));
  deleteIds.forEach((id) => form.append("delete_attachments[]", String(id)));

  const res = await apiClient.post(ep(role, `/project-task/${taskId}`), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.task ?? res.data?.data ?? res.data;
}

export async function deleteTask(role, taskId) {
  const res = await apiClient.delete(ep(role, `/project-task/${taskId}`));
  return res.data;
}

/** Replace a task's assignees. Empty array clears all (backend expects a
 *  sentinel empty employee_ids[] entry in that case — matches v1 exactly). */
export async function setTaskAssignees(role, taskId, employeeIds = []) {
  const form = new FormData();
  form.append("task_id", taskId);
  if (employeeIds.length === 0) {
    form.append("employee_ids[]", "");
  } else {
    employeeIds.forEach((id) => form.append("employee_ids[]", id));
  }
  const res = await apiClient.post(ep(role, "/bulk-assign"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
