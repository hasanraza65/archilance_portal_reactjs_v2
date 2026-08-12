// Legacy fallback only. The live numbers come from the backend's `policy` block
// (see balanceRulesFromPolicy) — under the Leave Policy of 1 Aug 2026, Casual
// is 10 for everyone and the BIM Team gets a SEPARATE 8-day Additional pool
// (its own balance, not folded into a bigger Casual number), so hardcoding
// either here would be wrong. Kept so an older backend still renders something.
export const LEAVE_ENTITLEMENTS = [
  { key: "casual", label: "Casual", total: 10, eligibleAfterMonths: 1 },
  { key: "annual", label: "Annual", total: 10, eligibleAfterMonths: 6 },
  { key: "sick", label: "Sick", total: 8, eligibleAfterMonths: 0 },
  { key: "additional", label: "Additional", total: 8, eligibleAfterMonths: 0, optional: true },
  { key: "other", label: "Other", total: 0, eligibleAfterMonths: 0, optional: true },
];

/** Short unit hint shown on each balance card. */
export function unitLabel(unit) {
  return unit === "calendar_days" ? "calendar days" : "working days";
}

/**
 * Balance cards straight from the backend policy — totals, usage, the counting
 * unit and any restriction note. Falls back to the legacy constants above when
 * the backend has not been updated yet.
 *
 * `usedByType` is the legacy `types` map, used only for that fallback.
 */
export function balanceRulesFromPolicy(policy, usedByType = {}, { includeAdditional = false } = {}) {
  if (policy?.entitlements) {
    // "additional" is only present in policy.entitlements for BIM Team
    // members (own 8-day pool) — the filter below naturally omits it for
    // everyone else, same pattern as every other type here.
    return ["casual", "additional", "annual", "sick", "marriage", "unpaid"]
      .filter((key) => policy.entitlements[key])
      .map((key) => {
        const e = policy.entitlements[key];
        return {
          key,
          label: e.label,
          total: e.total,                       // null => uncapped (Unpaid)
          used: Number(e.used || 0),
          remaining: e.remaining,
          unit: e.unit,
          scope: e.scope,                       // "leave_year" | "employment"
          available: e.available !== false,
          note: e.note || null,
        };
      });
  }

  return LEAVE_ENTITLEMENTS
    .filter((e) => e.key !== "other" && (e.key !== "additional" || includeAdditional))
    .map((e) => {
      const used = Number(usedByType[e.key] || 0);
      return {
        key: e.key,
        label: e.label,
        total: e.total,
        used,
        remaining: Math.max(0, e.total - used),
        unit: "working_days",
        scope: "leave_year",
        available: true,
        note: null,
      };
    });
}

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
