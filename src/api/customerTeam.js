import { apiClient } from "./client";
import { ep } from "./endpoint";

/* Customer's own team management — hardcoded to /api/customer/* in v1 (not role-prefixed). */
export async function fetchCustomerTeam() {
  const res = await apiClient.get("/api/customer/customer-team");
  return res.data?.data || [];
}

export async function createCustomerTeamMember({ name, email, phone }) {
  const form = new FormData();
  form.append("name", name);
  form.append("email", email);
  form.append("phone", phone || "");
  const res = await apiClient.post("/api/customer/customer-team", form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
}

export async function updateCustomerTeamMember(id, { name, email, phone }) {
  const form = new FormData();
  form.append("_method", "PUT");
  form.append("name", name);
  form.append("email", email);
  form.append("phone", phone || "");
  const res = await apiClient.post(`/api/customer/customer-team/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
}

export async function deleteCustomerTeamMember(id) {
  const res = await apiClient.delete(`/api/customer/customer-team/${id}`);
  return res.data;
}

/* Member's own "Team Access" view — /api/member/*. */
/**
 * Admin/staff view of EVERY customer's team members (paginated, 10 per page —
 * the page size is fixed server-side). Rows carry `customerUser` (the customer
 * org owner) and `teamUser` (the invited person).
 */
export async function fetchAllCustomerTeams(role, { page = 1 } = {}) {
  const res = await apiClient.get(ep(role, "/customer-team"), { params: { page } });
  const d = res.data;
  return {
    items: d?.data || (Array.isArray(d) ? d : []),
    currentPage: d?.current_page ?? 1,
    lastPage: d?.last_page ?? 1,
    total: d?.total ?? 0,
  };
}

/**
 * Team members belonging to ONE customer.
 *
 * The admin endpoint has no customer filter and pages at a fixed 10, so this
 * walks the pages and filters client-side. Capped at 20 pages (200 members) so
 * a surprise dataset can't turn into an unbounded request storm; `truncated`
 * tells the caller when the cap was hit rather than silently under-reporting.
 */
export async function fetchCustomerTeamFor(role, customerId, { maxPages = 20 } = {}) {
  const matches = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const res = await fetchAllCustomerTeams(role, { page });
    totalPages = res.lastPage;
    matches.push(
      ...res.items.filter(
        (r) => String(r.customer_id ?? r.customerUser?.id) === String(customerId)
      )
    );
    page += 1;
  }

  return { items: matches, truncated: totalPages > maxPages };
}

export async function deleteAnyCustomerTeamMember(role, id) {
  const res = await apiClient.delete(ep(role, `/customer-team/${id}`));
  return res.data;
}

export async function fetchMyTeamAccess() {
  const res = await apiClient.get("/api/member/customer-team");
  return res.data?.data || res.data || [];
}

export async function updateTeamMemberStatus(teamId, status) {
  const form = new FormData();
  form.append("team_id", teamId);
  form.append("status", status);
  const res = await apiClient.post("/api/member/update-team-status", form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
}
