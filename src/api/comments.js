import { apiClient } from "./client";
import { ep } from "./endpoint";

const path = (role) => ep(role, "/task-comment");

/**
 * A task has TWO independent comment threads, split by the `allowed_customer`
 * column — this is the core visibility rule of the app:
 *
 *   "internal" (allowed_customer = 0)  GET /task-comment
 *       Staff only. Customers must never see these.
 *
 *   "client"   (allowed_customer = 1)  GET /task-comment-with-customers
 *       Shared with the customer. Both staff and customers read and write here.
 *
 * The endpoints filter server-side, so a thread can only ever return its own
 * kind. Posting sets the flag to match the thread you're in.
 */
export const COMMENT_SCOPES = {
  internal: { allowedCustomer: 0, listPath: "/task-comment" },
  client: { allowedCustomer: 1, listPath: "/task-comment-with-customers" },
};

export async function fetchComments(role, taskId, page = 1, scope = "internal") {
  const { listPath } = COMMENT_SCOPES[scope] || COMMENT_SCOPES.internal;
  const res = await apiClient.get(ep(role, listPath), { params: { task_id: taskId, page } });
  const data = res.data;
  return {
    comments: data?.data || [],
    nextPageUrl: data?.links?.next || data?.next_page_url || null,
    total: data?.meta?.total ?? data?.total ?? 0,
  };
}

export async function fetchCommentsPage(nextPageUrl, taskId) {
  const url = new URL(nextPageUrl);
  if (!url.searchParams.get("task_id")) url.searchParams.set("task_id", taskId);
  const res = await apiClient.get(url.pathname + url.search);
  const data = res.data;
  return {
    comments: data?.data || [],
    nextPageUrl: data?.links?.next || data?.next_page_url || null,
    total: data?.meta?.total ?? data?.total ?? 0,
  };
}

export async function fetchCommentReplies(role, commentId) {
  const res = await apiClient.get(`${path(role)}/${commentId}`);
  const data = res.data?.data ?? res.data;
  return data?.replies || [];
}

export async function createComment(role, { taskId, message, replyTo, allowedCustomer = 0, attachments = [] }) {
  if (attachments.length === 0) {
    const res = await apiClient.post(path(role), {
      task_id: taskId,
      comment_message: message,
      allowed_customer: allowedCustomer,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
    return res.data?.data ?? res.data;
  }
  const form = new FormData();
  form.append("task_id", taskId);
  form.append("comment_message", message);
  form.append("allowed_customer", allowedCustomer);
  if (replyTo) form.append("reply_to", replyTo);
  attachments.forEach((file, i) => form.append(`attachments[${i}]`, file));
  const res = await apiClient.post(path(role), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
}

export async function updateComment(role, commentId, { message, deleteAttachmentIds = [], newAttachments = [] }) {
  const form = new FormData();
  form.append("_method", "PUT");
  form.append("comment_message", message);
  deleteAttachmentIds.forEach((id) => form.append("delete_attachments[]", id));
  newAttachments.forEach((file, i) => form.append(`attachments[${i}]`, file));
  const res = await apiClient.post(`${path(role)}/${commentId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
}

export async function deleteComment(role, commentId) {
  const res = await apiClient.delete(`${path(role)}/${commentId}`);
  return res.data;
}
