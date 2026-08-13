import { apiClient } from "./client";
import { apiPrefixForRole } from "@/lib/roles";

/**
 * Server-computed totals. These are real COUNT(*) queries, so they are exact —
 * unlike anything derived by counting a paginated list client-side.
 *
 * The endpoint differs by role family, and so does the shape:
 *
 *   admin / supervisor(role 6)  GET /api/{prefix}/dashboard  -> adminStats
 *     total_projects            = ALL Jobs
 *     total_tasks               = root tasks == the UI's "Projects" (NOT Tasks)
 *     total_users/employees/customers
 *
 *   employee family (role 3)    GET /api/employee/stats      -> employeeStats
 *     total_projects            = Jobs reached via project_assignees ONLY, so it
 *                                 is smaller than the job list, which also
 *                                 unions task_assignees
 *     total_tasks               = COUNT of task_assignees PIVOT ROWS: mixes both
 *                                 layers, includes Completed, and is not joined
 *                                 to project_tasks
 *
 *   customer                    GET /api/customer/dashboard  -> customerStats
 *     total_projects            = that customer's Jobs. No task counts at all.
 *
 *   member (role 5)             no route — returns null.
 *
 * The naming trap is why every caller must read the mapped fields below rather
 * than the raw keys: `total_tasks` does not mean "Tasks" in three of four cases.
 */
export async function fetchRoleStats(role) {
  const prefix = apiPrefixForRole(role);

  if (prefix === "member") return null;

  const path = prefix === "employee" ? "/api/employee/stats" : `/api/${prefix}/dashboard`;
  const res = await apiClient.get(path);
  const d = res.data || {};

  const isAdminShape = prefix === "admin";
  const isEmployeeShape = prefix === "employee";

  return {
    raw: d,
    source: path,
    /** Exact Job total for this viewer's scope. */
    jobs: num(d.total_projects),
    jobsInProgress: num(d.total_in_progress_projects),
    jobsCompleted: num(d.total_completed_projects),
    /** Exact count of UI-"Projects" (root tasks) — admin/supervisor only. */
    rootTasks: isAdminShape ? num(d.total_tasks) : null,
    /**
     * Assignment rows, employee family only. Deliberately NOT called `tasks`:
     * it counts pivot rows across both layers and includes completed work.
     */
    assignmentRows: isEmployeeShape ? num(d.total_tasks) : null,
    people: isAdminShape
      ? { users: num(d.total_users), employees: num(d.total_employees), customers: num(d.total_customers) }
      : null,
  };
}

const num = (v) => (typeof v === "number" ? v : Number.isFinite(Number(v)) ? Number(v) : null);
