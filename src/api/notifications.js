import { apiClient } from "./client";

export async function fetchNotifications() {
  const res = await apiClient.get("/api/my-notifications");
  return {
    notifications: res.data?.notifications?.data || [],
    totalUnread: res.data?.total_unread ?? 0,
    lastPage: res.data?.notifications?.last_page ?? 1,
  };
}

export async function markAllNotificationsRead() {
  const res = await apiClient.post("/api/update-notification-read-status");
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await apiClient.post(`/api/notifications/${id}/mark-as-read`);
  return res.data;
}

/**
 * Per-user EMAIL notification preferences. The backend owns the category
 * catalog (key/label/description/group) and always returns a COMPLETE
 * preference map, so the UI never has to guess a default.
 */
export async function fetchNotificationPreferences() {
  const res = await apiClient.get("/api/notification-preferences");
  return {
    categories: res.data?.categories || [],
    preferences: res.data?.preferences || {},
  };
}

/** Sends the whole map; the server ignores any key outside its catalog. */
export async function updateNotificationPreferences(preferences) {
  const res = await apiClient.put("/api/notification-preferences", { preferences });
  return {
    categories: res.data?.categories || [],
    preferences: res.data?.preferences || {},
  };
}

/** Where clicking a notification should navigate (mirrors v1's routing quirks). */
export function notificationLink(n) {
  const type = n?.notification_type || "";
  if (type.includes("task_")) {
    return n.task_id ? `/jobs/task/${n.task_id}` : `/jobs/${n.project_id}`;
  }
  if (type.includes("project_")) {
    return `/jobs/${n.project_id}`;
  }
  return "/notifications";
}
