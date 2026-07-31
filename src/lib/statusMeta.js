// Exact API values from the live backend (verified against the v1 app) — keep
// these strings byte-identical to what's persisted in project_tasks.task_status
// / .priority, since the API stores and matches on these literals.

export const STATUS_OPTIONS = [
  { value: "Backlog", label: "Backlog", color: "var(--color-status-backlog)" },
  { value: "On Hold", label: "On Hold", color: "var(--color-status-onhold)" },
  { value: "Awaiting Info", label: "Awaiting Info", color: "var(--color-status-awaiting)" },
  { value: "In Progress", label: "In Progress", color: "var(--color-status-progress)" },
  { value: "In-house review", label: "In-house Review", color: "var(--color-status-inhouse)" },
  { value: "Client Review", label: "Client Review", color: "var(--color-status-client)" },
  { value: "Completed", label: "Completed", color: "var(--color-status-completed)" },
];

export const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low", color: "var(--color-priority-low)", icon: "solar:double-alt-arrow-down-bold" },
  { value: "Normal", label: "Normal", color: "var(--color-priority-normal)", icon: "solar:menu-dots-bold" },
  { value: "High", label: "High", color: "var(--color-priority-high)", icon: "solar:double-alt-arrow-up-bold" },
  { value: "Urgent", label: "Urgent", color: "var(--color-priority-urgent)", icon: "solar:danger-triangle-bold" },
];

export function statusMeta(status) {
  const found = STATUS_OPTIONS.find(
    (s) => s.value.toLowerCase() === String(status || "").toLowerCase()
  );
  return found || { value: status || "Backlog", label: status || "Backlog", color: "var(--color-neutral-400)" };
}

export function priorityMeta(priority) {
  const found = PRIORITY_OPTIONS.find(
    (p) => p.value.toLowerCase() === String(priority || "").toLowerCase()
  );
  return found || null; // no priority set is a valid, common state
}

export const isCompletedStatus = (status) =>
  String(status || "").toLowerCase() === "completed";
