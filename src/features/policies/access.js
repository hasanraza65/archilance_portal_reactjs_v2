// Shared visibility rule for the Leave Policy feature — used by the sidebar
// nav, the mobile drawer, the command palette, the entry-point buttons on
// My Leaves / Staff Leaves, and the Policies page itself, so all of them
// stay in sync instead of drifting.
//
//  - Internees never see leave policies — their track isn't governed by
//    this policy at all (see My Grading instead).
//  - Outsource Department and Business Team aren't covered by this policy
//    either, so their members can't see it. Admin/manager/supervisor are
//    exempt — they browse any team's policy for management purposes, not
//    for themselves, via the switcher on the Policies page.
export const RESTRICTED_POLICY_TEAMS = ["Outsource Department", "Business Team"];

const POLICY_MANAGE_ROLES = ["admin", "manager", "supervisor"];

export function canViewPolicies(user) {
  if (!user) return false;
  if (user.role === "internee") return false;
  if (POLICY_MANAGE_ROLES.includes(user.role)) return true;
  return !RESTRICTED_POLICY_TEAMS.includes(user.employee_team);
}
