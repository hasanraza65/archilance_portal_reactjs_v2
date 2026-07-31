// Entitlement rules verified against the live app + backend (v1 client constants
// and employee/LeaveRequestController limits agree on these numbers).
export const LEAVE_ENTITLEMENTS = [
  { key: "casual", label: "Casual", total: 10, eligibleAfterMonths: 1 },
  { key: "annual", label: "Annual", total: 10, eligibleAfterMonths: 6 },
  { key: "sick", label: "Sick", total: 8, eligibleAfterMonths: 0 },
  { key: "additional", label: "Additional", total: 8, eligibleAfterMonths: 0, optional: true },
  { key: "other", label: "Other", total: 0, eligibleAfterMonths: 0, optional: true },
];

/** Whole months of service, matching v1's calculateServiceMonths exactly. */
export function serviceMonths(joiningDate) {
  if (!joiningDate) return null;
  const join = new Date(joiningDate);
  if (Number.isNaN(join.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
  if (now.getDate() < join.getDate()) months -= 1;
  return Math.max(0, months);
}

export function eligibilityNote(key, months) {
  const rule = LEAVE_ENTITLEMENTS.find((e) => e.key === key);
  if (!rule?.eligibleAfterMonths || months === null) return null;
  if (months >= rule.eligibleAfterMonths) return null;
  return `Available after ${rule.eligibleAfterMonths} month${rule.eligibleAfterMonths === 1 ? "" : "s"} of service`;
}

/** Bar colour by how much is left — mirrors v1's green/amber/red thresholds. */
export function balanceTone(remaining) {
  if (remaining >= 5) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Good" };
  if (remaining >= 2) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Low" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Critical" };
}
