const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(value, { withYear = true } = {}) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ""}`;
}

export function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${formatDate(d)} at ${h}:${m} ${ampm}`;
}

/** "in 2 days" / "3 days overdue" / "today" / "tomorrow" — the phrasing ClickUp uses. */
export function formatRelativeDue(value) {
  if (!value) return "";
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -6) return `${Math.abs(diffDays)} days overdue`;
  return formatDate(due);
}

export function isOverdue(value, completed = false) {
  if (!value || completed) return false;
  const due = new Date(value);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

/** seconds -> "2h 14m" (0 -> "0m") */
export function formatDuration(totalSeconds) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic pastel-ish color from a string (avatar fallback backgrounds). */
export function colorFromString(str) {
  const palette = [
    "#6d5ef8", "#f0562b", "#0891b2", "#7c3aed", "#059669",
    "#db2777", "#4f46e5", "#ea580c", "#0d9488", "#c026d3",
  ];
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = String(str).charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
