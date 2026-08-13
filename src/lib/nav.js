// Redesigned information architecture — same role gates as v1's data.js
// (verified against the live app), grouped for a clearer sidebar.

import { canViewPolicies } from "@/features/policies/access";
import { canUseMyLeaves } from "@/features/leave/access";

export const NAV_GROUPS = [
  {
    label: null,
    items: [
      { title: "Dashboard", icon: "solar:widget-5-bold-duotone", link: "/dashboard", roles: ["admin", "customer"] },
      {
        title: "My Dashboard",
        icon: "solar:speedometer-max-bold-duotone",
        link: "/my-dashboard",
        roles: ["employee", "manager", "supervisor", "executive", "outsource", "internee"],
      },
      {
        title: "Jobs",
        icon: "solar:checklist-minimalistic-bold-duotone",
        link: "/jobs",
        roles: ["admin", "employee", "customer", "member", "outsource", "manager", "supervisor", "executive", "internee"],
      },
      { title: "Chat", icon: "solar:chat-round-dots-bold-duotone", link: "/chat", roles: ["admin", "employee", "outsource", "manager", "supervisor", "executive"] },
    ],
  },
  {
    label: "Time & Leave",
    items: [
      { title: "Work Diary", icon: "solar:clock-circle-bold-duotone", link: "/work-diary", roles: ["employee", "outsource", "manager", "supervisor", "executive"] },
      // The tracker is what fills the work diary, so it belongs next to it.
      { title: "Desktop App", icon: "solar:monitor-bold-duotone", link: "/download", roles: ["admin", "employee", "outsource", "manager", "supervisor", "executive", "internee"] },
      {
        title: "My Leaves",
        icon: "solar:calendar-mark-bold-duotone",
        link: "/my-leaves",
        // "outsource" role removed — they, and anyone on the Outsource
        // Department team regardless of role, arrange leave with their
        // manager directly rather than through the portal (see `hidden`).
        roles: ["employee", "manager", "supervisor", "executive"],
        hidden: (user) => !canUseMyLeaves(user),
      },
      { title: "Staff Leaves", icon: "solar:users-group-two-rounded-bold-duotone", link: "/leaves", roles: ["admin", "manager", "supervisor", "executive", "member"] },
      {
        title: "Policies",
        icon: "solar:shield-check-bold-duotone",
        link: "/policies",
        // Internees are excluded here too — the team-based exclusion
        // (Outsource Department / Business Team) can't be expressed as a
        // fixed role list, so it's handled by `hidden` below instead.
        roles: ["admin", "employee", "manager", "outsource", "supervisor", "executive"],
        hidden: (user) => !canViewPolicies(user),
      },
      { title: "My Grading", icon: "solar:medal-ribbons-star-bold-duotone", link: "/my-grading", roles: ["internee"] },
      { title: "Internee Grading", icon: "solar:star-bold-duotone", link: "/internee-grading", roles: ["admin", "manager", "supervisor", "executive"] },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Employees", icon: "solar:users-group-rounded-bold-duotone", link: "/employees", roles: ["admin", "manager", "supervisor", "executive"] },
      { title: "Customers", icon: "solar:buildings-2-bold-duotone", link: "/customers", roles: ["admin", "manager", "supervisor", "executive"] },
      { title: "Customer Teams", icon: "solar:users-group-two-rounded-bold-duotone", link: "/customer-teams", roles: ["admin", "manager", "supervisor", "executive"] },
      { title: "Customer Team", icon: "solar:users-group-rounded-linear", link: "/team", roles: ["customer"] },
      { title: "Team Access", icon: "solar:shield-user-bold-duotone", link: "/teamaccess", roles: ["member"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Contracts", icon: "solar:document-text-bold-duotone", link: "/contracts", roles: ["admin", "executive"] },
      { title: "Subscription", icon: "solar:wallet-money-bold-duotone", link: "/subscriptions", roles: ["customer"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Role gate, plus an item's own extra `hidden(user)` predicate if it has
 *  one (see "Policies" above) — the single check the sidebar, mobile drawer
 *  and command palette all defer to, so they can't drift out of sync. */
export function isNavItemVisible(item, user) {
  if (!item.roles.includes(user?.role)) return false;
  if (item.hidden && item.hidden(user)) return false;
  return true;
}

export const JOBS_LANDING_ROLES = [
  "employee", "manager", "outsource", "member", "supervisor", "executive", "internee",
];

// Roles that get the personal, role-aware dashboard as their landing page.
const MY_DASHBOARD_ROLES = ["employee", "manager", "supervisor", "executive", "outsource", "internee"];

/** Where "/" should redirect a signed-in user. */
export function homeRouteForRole(role) {
  if (MY_DASHBOARD_ROLES.includes(role)) return "/my-dashboard";
  return JOBS_LANDING_ROLES.includes(role) ? "/jobs" : "/dashboard";
}

/** Primary items surfaced on the mobile bottom tab bar (max ~5 for thumb reach). */
export function mobileTabsForRole(role) {
  const candidates = [
    { title: "Home", icon: "solar:speedometer-max-bold-duotone", link: "/my-dashboard" },
    { title: "Jobs", icon: "solar:checklist-minimalistic-bold-duotone", link: "/jobs" },
    { title: "Diary", icon: "solar:clock-circle-bold-duotone", link: "/work-diary" },
    { title: "Chat", icon: "solar:chat-round-dots-bold-duotone", link: "/chat" },
    { title: "Profile", icon: "solar:user-circle-bold-duotone", link: "/profile" },
  ];
  const allowed = new Set(ALL_NAV_ITEMS.filter((i) => i.roles.includes(role)).map((i) => i.link));
  return candidates.filter((c) => allowed.has(c.link) || c.link === "/profile");
}
