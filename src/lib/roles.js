// Mirrors the role system in archilance_portal_reactjs exactly (same backend,
// same user_role ids), so this app authenticates against the SAME live API
// without any backend change.

export const ROLE_MAP = {
  2: "admin",
  3: "employee",
  4: "customer",
  5: "member",
  6: "supervisor",
  7: "executive",
};

const EMPLOYEE_SUBTYPES = ["manager", "outsource", "supervisor", "executive", "internee"];

/** user_role id + employee_type (raw API user object) -> the app's role string. */
export function resolveRole(userData) {
  let role = ROLE_MAP[userData?.user_role] || "unknown";
  if (role === "employee" && userData?.employee_type) {
    const type = String(userData.employee_type).toLowerCase();
    if (EMPLOYEE_SUBTYPES.includes(type)) role = type;
  }
  return role;
}

/** role string -> the API route prefix (/api/{prefix}/...) */
export function apiPrefixForRole(role) {
  switch (role) {
    case "manager":
    case "outsource":
    case "employee":
    case "supervisor":
    case "executive":
    case "internee":
      return "employee";
    case "admin":
      return "admin";
    case "customer":
      return "customer";
    case "member":
      return "member";
    default:
      return "customer";
  }
}

export const JOBS_LANDING_ROLES = [
  "employee", "manager", "outsource", "member", "supervisor", "executive", "internee",
];

export const canManageEmployees = (role) =>
  ["admin", "manager", "supervisor", "executive"].includes(role);

export const isAdminOrExecutive = (role) => ["admin", "executive"].includes(role);

export const isInternalRole = (role) => role !== "customer" && role !== "member";
