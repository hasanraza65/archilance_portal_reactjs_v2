import { apiClient } from "./client";
import { ep } from "./endpoint";

/**
 * Briefs — documentation attached to a job (project) or a task. One controller
 * pair with the same shape, so a single module covers both via `scope`.
 *
 * Briefs already arrive with the parent record: `project.allBriefs` and
 * `task.allBriefs`, each with `.attachments`. These calls are for WRITES; the
 * read comes free with the detail fetch.
 */
const PATH = { project: "/project-brief", task: "/task-brief" };

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

function appendFiles(form, files = []) {
  // The backend validates `attachments.*`, so any array-ish key works — v1 used
  // both `attachments[0]` and `attachments[]`. Sticking to `attachments[]`.
  for (const file of files) form.append("attachments[]", file);
}

export async function createBrief(role, scope, { parentId, description, date, files = [] }) {
  const form = new FormData();
  form.append(scope === "task" ? "task_id" : "project_id", String(parentId));
  form.append("brief_description", description);
  if (date) form.append("brief_date", date);
  appendFiles(form, files);
  const res = await apiClient.post(ep(role, PATH[scope]), form, multipart);
  return res.data;
}

export async function updateBrief(role, scope, briefId, { description, date, files = [], deleteAttachmentIds = [] }) {
  const form = new FormData();
  // Laravel doesn't parse multipart bodies on a real PUT, so spoof the method.
  form.append("_method", "put");
  if (description !== undefined) form.append("brief_description", description);
  if (date !== undefined && date !== null) form.append("brief_date", date);
  appendFiles(form, files);
  for (const id of deleteAttachmentIds) form.append("delete_attachments[]", String(id));
  const res = await apiClient.post(ep(role, `${PATH[scope]}/${briefId}`), form, multipart);
  return res.data;
}

export async function deleteBrief(role, scope, briefId) {
  const res = await apiClient.delete(ep(role, `${PATH[scope]}/${briefId}`));
  return res.data;
}
