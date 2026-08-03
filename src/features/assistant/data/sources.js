import { fetchProjects, fetchProjectsWithMembers, fetchAllProjectTasks, fetchJobRootTasks } from "@/api/projects";
import { fetchRoleStats } from "@/api/dashboard";
import { fetchMyWorkSessions, fetchEmployeeWorkSessions } from "@/api/workSessions";
import { fetchMyLeaveRequests, fetchLeaveRequests } from "@/api/leave";
import { fetchWorkingHours } from "@/api/workingHours";

/**
 * Every backend read the assistant makes, funnelled through React Query.
 *
 * Two reasons it all goes through the QueryClient rather than plain axios:
 *  - the Jobs / Dashboard / Work Diary pages have usually already paid for this
 *    data, so a warm cache makes the answer instant;
 *  - a question that needs the same source twice fetches once.
 *
 * Query keys deliberately mirror the ones the pages use where the call is
 * identical, so the cache is genuinely shared and not merely duplicated.
 */

const MINUTE = 60_000;

const get = (qc, key, fn, staleTime = 2 * MINUTE) =>
  qc.fetchQuery({ queryKey: key, queryFn: fn, staleTime });

export const sources = {
  /** All jobs visible to this account. Unpaginated on every role's endpoint. */
  jobs: (ctx) => get(ctx.qc, ["jobs", ctx.role, undefined, undefined], () => fetchProjects(ctx.role, {})),

  /**
   * Per-employee assigned tasks, BOTH layers, unpaginated. The backend returns
   * every user_role 3 account; peer visibility is applied by the caller.
   */
  members: (ctx) =>
    get(ctx.qc, ["assistant-members", ctx.role], () =>
      // peerScope makes the SERVER apply the manager/executive rule too. The
      // client-side peerFilter still runs on top, so the rule holds even
      // against a backend that predates this parameter.
      fetchProjectsWithMembers(ctx.role, { peerScope: true })),

  /**
   * Every task in one call. Scope depends on employee_type server-side:
   * exactly "Employee" gets only their own, everyone else gets the whole org.
   */
  allTasks: (ctx) => get(ctx.qc, ["assistant-all-tasks", ctx.role], () => fetchAllProjectTasks(ctx.role)),

  /** Server-computed exact totals. */
  stats: (ctx) => get(ctx.qc, ["assistant-stats", ctx.role], () => fetchRoleStats(ctx.role), 5 * MINUTE),

  rootTasksForJob: (ctx, jobId) =>
    get(ctx.qc, ["job-root-tasks", ctx.role, jobId], () => fetchJobRootTasks(ctx.role, jobId)),

  workSessions: (ctx, { startDate, endDate }) =>
    get(ctx.qc, ["my-work-sessions", ctx.role, startDate, endDate, undefined, undefined],
      () => fetchMyWorkSessions(ctx.role, { startDate, endDate, page: 1 })),

  /** Another person's diary — admin/manager/supervisor/executive only. */
  employeeSessions: (ctx, employeeId, { startDate, endDate }) =>
    get(ctx.qc, ["assistant-emp-sessions", ctx.role, employeeId, startDate, endDate],
      () => fetchEmployeeWorkSessions(ctx.role, employeeId, { startDate, endDate })),

  /** show($id) treats the id as an EMPLOYEE id, not a slot id — see the api module. */
  workingHours: (ctx, employeeId) =>
    get(ctx.qc, ["working-hours", ctx.role, employeeId], () => fetchWorkingHours(ctx.role, employeeId), 10 * MINUTE),

  myLeave: (ctx) => get(ctx.qc, ["assistant-my-leave", ctx.role], () => fetchMyLeaveRequests(ctx.role)),

  leaveQueue: (ctx) =>
    get(ctx.qc, ["assistant-leave-queue", ctx.role], () => fetchLeaveRequests(ctx.role, { perPage: 100 })),
};

/**
 * Turns any thrown request into something the assistant can say out loud.
 *
 * The distinction that matters most is 403 vs empty: "you're not allowed to see
 * that" and "there is nothing there" are different answers, and the old
 * assistant reported both as zero.
 */
export function classifyError(err) {
  const status = err?.response?.status;
  if (status === 401) return { kind: "auth", message: "Your session expired — sign in again and I'll pick this up." };
  if (status === 403) return { kind: "forbidden", message: "Your account isn't allowed to read that." };
  if (status === 404) return { kind: "not_routed", message: "That isn't available for your account type." };
  if (status === 422) return { kind: "needs_param", message: "I couldn't build that query." };
  if (status >= 500) return { kind: "server", message: "The server had a problem with that one." };
  if (err?.code === "ERR_NETWORK" || !err?.response) {
    return { kind: "offline", message: "I couldn't reach the server just now." };
  }
  return { kind: "unknown", message: "Something went wrong fetching that." };
}

/** Runs a source and returns [value, error] instead of throwing. */
export async function attempt(fn) {
  try {
    return [await fn(), null];
  } catch (err) {
    return [null, classifyError(err)];
  }
}
