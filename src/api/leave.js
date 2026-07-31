import { apiClient } from "./client";
import { ep } from "./endpoint";

export const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "other", label: "Other (Specify)" },
];

export async function fetchMyLeaveRequests(role) {
  const res = await apiClient.get(ep(role, "/leave-request"));
  const data = res.data;
  return Array.isArray(data) ? data : data?.data || [];
}

/**
 * Admin/manager viewing all leave requests. Admins hit /api/admin/leave-request;
 * everyone else (manager/supervisor/executive/outsource) hits
 * /api/employee/other-leave-request — mirrors the work-session split exactly.
 * Params verified against v1: page, per_page, status, user_id (comma-joined),
 * leave_type, from, to.
 */
export async function fetchLeaveRequests(viewerRole, { page, perPage, status, userIds, leaveType, from, to } = {}) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const params = { page, per_page: perPage };
  if (status && status !== "All") params.status = status;
  if (userIds?.length) params.user_id = userIds.join(",");
  if (leaveType) params.leave_type = leaveType;
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await apiClient.get(ep(viewerRole, path), { params });
  const data = res.data;
  return {
    items: data?.data || (Array.isArray(data) ? data : []),
    currentPage: data?.current_page ?? 1,
    lastPage: data?.last_page ?? 1,
    total: data?.total ?? 0,
    counts: data?.counts || { total: 0, pending: 0, approved: 0, rejected: 0 },
  };
}

export async function createLeaveRequest(role, { startDate, endDate, reason, leaveType }) {
  const res = await apiClient.post(ep(role, "/leave-request"), {
    start_date: startDate,
    end_date: endDate,
    reason,
    leave_type: leaveType,
  });
  return res.data?.data ?? res.data;
}

export async function updateLeaveRequest(role, id, { startDate, endDate, reason, leaveType }) {
  const res = await apiClient.put(ep(role, `/leave-request/${id}`), {
    start_date: startDate,
    end_date: endDate,
    reason,
    leave_type: leaveType,
  });
  return res.data?.data ?? res.data;
}

/** Admin/manager approve or reject — matches v1's POST + _method=put FormData pattern. */
export async function updateLeaveStatus(viewerRole, id, status) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const form = new FormData();
  form.append("status", status);
  form.append("_method", "put");
  const res = await apiClient.post(ep(viewerRole, `${path}/${id}`), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Detail for one leave request. Beyond the request itself the backend returns
 * `leave_summary` (days USED per type in the current cycle) and `cycle`
 * (the employee's leave-year window), which together drive the balance view.
 */
export async function fetchLeaveRequestDetail(viewerRole, id) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const res = await apiClient.get(ep(viewerRole, `${path}/${id}`));
  return {
    request: res.data?.data ?? res.data,
    summary: res.data?.leave_summary || {},
    cycle: res.data?.cycle || null,
  };
}

export async function deleteLeaveRequest(viewerRole, id) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const res = await apiClient.delete(ep(viewerRole, `${path}/${id}`));
  return res.data;
}
