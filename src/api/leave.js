import { apiClient } from "./client";
import { ep } from "./endpoint";

/**
 * Fallback list, used only until the backend's `policy` block arrives (and by
 * any older backend that doesn't send one). The live list is derived from
 * `policy.entitlements` — see leaveTypeOptions() below.
 */
export const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "other", label: "Other (Specify)" },
];

/** "Other" is not an entitlement — it is submitted as Casual with a tagged reason. */
export const OTHER_TYPE = { value: "other", label: "Other (Specify)" };

/**
 * Selectable leave types for the apply form, driven by the backend policy so a
 * change to entitlements never needs a frontend release. Types the employee is
 * currently barred from (e.g. Annual during probation) are returned with
 * `disabled` + the reason rather than hidden, so the rule is visible.
 */
export function leaveTypeOptions(policy) {
  const entitlements = policy?.entitlements;
  if (!entitlements) return [...LEAVE_TYPES];

  // "additional" (BIM Team public-holiday compensation, its own 8-day pool —
  // NOT merged into casual) is only present in `entitlements` for BIM Team
  // members, so the .filter() below naturally omits it for everyone else.
  const ordered = ["casual", "additional", "annual", "sick", "marriage", "unpaid"];
  const options = ordered
    .filter((key) => entitlements[key])
    .map((key) => {
      const e = entitlements[key];
      return {
        value: key,
        label: `${e.label} Leave`,
        disabled: e.available === false,
        note: e.note || null,
      };
    });

  return [...options, OTHER_TYPE];
}

export async function fetchMyLeaveRequests(role) {
  const res = await apiClient.get(ep(role, "/leave-request"));
  const data = res.data;
  return Array.isArray(data) ? data : data?.data || [];
}

/**
 * The FULL index response — the endpoint also returns `types` (weekdays used
 * per leave type in the current cycle), `counts` (all-time status totals) and
 * `cycle` (the joining-anniversary window). fetchMyLeaveRequests() above throws
 * those away, which is why My Leaves had no balance cards.
 */
export async function fetchMyLeaveEnvelope(role) {
  const res = await apiClient.get(ep(role, "/leave-request"));
  const raw = res.data || {};
  return {
    data: Array.isArray(raw) ? raw : raw.data || [],
    types: raw.types || {},
    counts: raw.counts || null,
    cycle: raw.cycle || null,
    // Current leave policy: entitlements, balances, probation state and the
    // rule constants. Null when talking to a backend that predates the policy.
    policy: raw.policy || null,
  };
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
    policy: res.data?.policy || null,
  };
}

/**
 * Record leave FOR an employee — the management exception path.
 *
 * Post without `override` first: a policy breach comes back as 422 carrying
 * `policy_violation` and `can_override`, which the UI shows before re-posting
 * with `override: true` and a justification.
 */
export async function createLeaveOnBehalf(viewerRole, {
  userId, startDate, endDate, reason, leaveType, status, override, overrideReason,
}) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const res = await apiClient.post(ep(viewerRole, path), {
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
    reason,
    leave_type: leaveType,
    status,
    override: override ? 1 : undefined,
    override_reason: override ? overrideReason : undefined,
  });
  return res.data;
}

export async function deleteLeaveRequest(viewerRole, id) {
  const path = viewerRole === "admin" ? "/leave-request" : "/other-leave-request";
  const res = await apiClient.delete(ep(viewerRole, `${path}/${id}`));
  return res.data;
}
