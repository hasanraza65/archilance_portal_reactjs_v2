import { apiClient } from "./client";
import { ep } from "./endpoint";

export async function fetchEmployees(role, { page, perPage, search, employeeType } = {}) {
  const params = {};
  if (page) params.page = page;
  if (perPage) params.per_page = perPage;
  if (search) params.search = search;
  if (employeeType) params.employee_type = employeeType;
  const res = await apiClient.get(ep(role, "/employee-user"), { params });
  const data = res.data;
  if (Array.isArray(data)) return { items: data, currentPage: 1, lastPage: 1, total: data.length };
  return {
    items: data?.data || [],
    currentPage: data?.current_page ?? 1,
    lastPage: data?.last_page ?? 1,
    total: data?.total ?? (data?.data || []).length,
  };
}

/**
 * The COMPLETE roster, walking every page.
 *
 * fetchEmployees returns a single page and the backend clamps `per_page` to
 * 200, so one call quietly truncates once the company grows past that. For a
 * picker that's a cosmetic gap; for the bulk diary export it would mean people
 * silently missing from a monthly report, which is the worst kind of bug
 * because the output still looks complete. So anything that must not miss
 * anyone walks the pages instead of trusting one call.
 */
export async function fetchAllEmployees(role, { perPage = 200, maxPages = 25 } = {}) {
  const first = await fetchEmployees(role, { page: 1, perPage });
  const items = [...first.items];
  const lastPage = Math.min(Number(first.lastPage) || 1, maxPages);
  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchEmployees(role, { page, perPage });
    items.push(...next.items);
  }
  return items;
}

export async function fetchEmployee(role, id) {
  const res = await apiClient.get(ep(role, `/employee-user/${id}`));
  return res.data?.data ?? res.data;
}

export const EMPLOYEE_TYPES = ["Employee", "Manager", "Supervisor", "Executive", "Outsource", "Internee"];

/**
 * Build the create/update payload.
 *
 * Two things worth knowing about the backend here:
 *  - `user_role` is derived from the ROUTE segment (`/employee-user` -> 3), not from
 *    anything we send, so the sub-type lives entirely in `employee_type`.
 *  - `profile_pic` is NOT handled by this controller at all — it silently drops the
 *    file — so the form deliberately doesn't offer an avatar upload. Users set their
 *    own picture from their profile page.
 */
function employeePayload(v, { isEdit }) {
  const body = {
    name: v.name,
    email: v.email || "",
    username: v.username || "",
    phone: v.phone || "",
    employee_type: v.employeeType,
    joining_date: v.joiningDate || null,
    probation_period_end_date: v.probationEndDate || null,
    internee_manager_id: v.employeeType === "Internee" ? v.interneeManagerId || null : null,
    manager_id: ["Employee", "Manager", "Executive"].includes(v.employeeType) ? v.managerId || null : null,
  };
  // Only send employee_team when the form carried the field at all — update()
  // ignores an absent key, so callers that never load the dropdown can't wipe
  // a saved team. An empty selection explicitly clears it.
  if (v.employeeTeam !== undefined) body.employee_team = v.employeeTeam || "";
  // Only send contract_status when the caller may set it — update() leaves the
  // column untouched unless the key is present, so a normal edit can't re-lock
  // somebody out of the portal.
  if (v.contractStatus !== undefined) body.contract_status = v.contractStatus ? 1 : 0;
  if (!isEdit || v.password) {
    body.password = v.password;
    body.password_confirmation = v.passwordConfirmation ?? v.password;
  }
  return body;
}

export async function createEmployee(role, values) {
  const res = await apiClient.post(ep(role, "/employee-user"), employeePayload(values, { isEdit: false }));
  return res.data?.data ?? res.data;
}

export async function updateEmployee(role, id, values) {
  const res = await apiClient.put(ep(role, `/employee-user/${id}`), employeePayload(values, { isEdit: true }));
  return res.data?.data ?? res.data;
}

export async function deleteEmployee(role, id) {
  const res = await apiClient.delete(ep(role, `/employee-user/${id}`));
  return res.data;
}

export async function updateJoiningDate(role, employeeId, joiningDate) {
  const res = await apiClient.post(ep(role, "/update-joining-date"), {
    employee_id: employeeId,
    joining_date: joiningDate,
  });
  return res.data;
}
