/**
 * What each account is ALLOWED to ask about, and whose data it may see.
 *
 * Two separate things live here:
 *
 * 1. SOURCE LEGALITY — which endpoints exist for this role. Route groups are
 *    gated by `role:N` on user_role, and there is NO route group for role 7 at
 *    all, so a genuine user_role 7 account 403s on every /api/employee/* call.
 *    When a source is illegal we must REFUSE, never answer 0 — "you have no
 *    tasks" and "I'm not allowed to look" are completely different answers.
 *
 * 2. PEER VISIBILITY — whose records may be reported. This mirrors the rule
 *    already enforced server-side for leave requests
 *    (LeaveRequestController::managerHiddenUserIds): a manager may see the
 *    employees under them, but NOT other managers and NOT executives. Admin and
 *    executive see everyone.
 *
 *    NOTE ON ENFORCEMENT: projects-with-members returns every user_role 3 row
 *    regardless of who asks, so this filter runs client-side. It governs what
 *    the assistant reports and counts; it is not a server guarantee. The same
 *    payload already reaches the browser for the Members view, so this adds no
 *    new exposure — but if the rule must be enforced rather than observed, the
 *    peer filter has to move into projectsWithMember() on the backend.
 */

const EMPLOYEE_FAMILY = ["employee", "manager", "outsource", "supervisor", "executive", "internee"];

/** Roles allowed to look at anyone other than themselves. */
const CAN_SEE_OTHERS = ["admin", "manager", "supervisor", "executive"];

/** Employee sub-types a MANAGER (or type-Supervisor) must not see. */
const HIDDEN_FROM_MANAGER = ["manager", "supervisor", "executive"];

export function capabilitiesFor(user) {
  const role = String(user?.role || "").toLowerCase();
  const userRole = Number(user?.user_role);
  const employeeType = String(user?.employee_type || "").toLowerCase();

  const isAdmin = role === "admin";
  const isCustomer = role === "customer";
  const isMember = role === "member";
  const inEmployeeFamily = EMPLOYEE_FAMILY.includes(role);

  // The /api/employee/* group is middleware('role:3'). A user_role 6 supervisor
  // uses /api/supervisor/*; a user_role 7 executive has no group of its own.
  const usesEmployeeRoutes = inEmployeeFamily && userRole === 3;
  const usesSupervisorRoutes = userRole === 6;
  const orphanedRole = !isAdmin && !isCustomer && !isMember && !usesEmployeeRoutes && !usesSupervisorRoutes;

  return {
    role,
    userRole,
    employeeType,
    /** True when this account has no prefixed route group — refuse, don't zero. */
    orphaned: orphanedRole,

    sources: {
      // GET /{prefix}/project — exists for admin, supervisor, employee, customer, member
      jobs: !orphanedRole,
      // GET /{prefix}/projects-with-members — admin, supervisor, and all role 3
      members: isAdmin || usesSupervisorRoutes || usesEmployeeRoutes,
      // GET /employee/all-project-tasks — employee prefix only
      allTasks: usesEmployeeRoutes,
      // GET /{prefix}/dashboard | /employee/stats — no route for member
      stats: !isMember && !orphanedRole,
      // work sessions
      hours: !isCustomer && !isMember && !orphanedRole,
      // leave
      myLeave: inEmployeeFamily && !orphanedRole,
      leaveQueue: isAdmin || ["manager", "supervisor", "executive"].includes(role),
      roster: isAdmin || ["manager", "supervisor", "executive"].includes(role),
    },

    /** May this account ask about people other than itself at all? */
    canSeeOthers: CAN_SEE_OTHERS.includes(role),

    /**
     * Filter applied to any per-person data before it is counted or shown.
     * Admin and executive: everyone. Manager/supervisor: employees only.
     * Everyone else: themselves.
     */
    peerFilter: buildPeerFilter(role, user?.id),
    /** Human-readable reason, used verbatim when the assistant declines. */
    peerNote: peerNoteFor(role),
  };
}

function buildPeerFilter(role, myId) {
  if (role === "admin" || role === "executive") return () => true;

  if (role === "manager" || role === "supervisor") {
    return (person) => {
      if (Number(person?.id) === Number(myId)) return true; // always yourself
      const type = String(person?.employee_type || "").toLowerCase();
      if (HIDDEN_FROM_MANAGER.includes(type)) return false;
      // A role-7 executive can appear without an employee_type.
      if (Number(person?.user_role) === 7) return false;
      return true;
    };
  }

  return (person) => Number(person?.id) === Number(myId);
}

function peerNoteFor(role) {
  if (role === "manager" || role === "supervisor") {
    return "Managers and executives aren't included — you can see the employees reporting in.";
  }
  return null;
}

export { EMPLOYEE_FAMILY };
