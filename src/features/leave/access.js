// Who can use the "My Leaves" apply/track flow at all — used by the sidebar
// nav, the route guard in App.jsx, and MyLeavesPage itself, so all three
// stay in sync.
//
//  - Internees never get it — see My Grading instead.
//  - The "Outsource" ROLE (employee_type = Outsource, an external
//    contractor) never gets it — they arrange time off directly with
//    their manager, outside the portal's entitlement system.
//  - "Outsource Department" — the TEAM (employee_team), independent of
//    role — doesn't get it either, for the same reason. This can apply to
//    an Employee/Manager/etc. whose employee_team happens to be that team.
export function canUseMyLeaves(user) {
  if (!user) return false;
  if (user.role === "internee" || user.role === "outsource") return false;
  if (user.employee_team === "Outsource Department") return false;
  return true;
}
