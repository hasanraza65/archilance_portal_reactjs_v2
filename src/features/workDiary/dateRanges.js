import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths,
} from "date-fns";

const iso = (d) => format(d, "yyyy-MM-dd");

/** Shared date-range presets for every work-diary view. Default is Today. */
export const RANGE_PRESETS = [
  { key: "today", label: "Today", range: () => { const d = new Date(); return [iso(d), iso(d)]; } },
  { key: "yesterday", label: "Yesterday", range: () => { const d = subDays(new Date(), 1); return [iso(d), iso(d)]; } },
  { key: "week", label: "This Week", range: () => [iso(startOfWeek(new Date(), { weekStartsOn: 1 })), iso(endOfWeek(new Date(), { weekStartsOn: 1 }))] },
  { key: "last7", label: "Last 7 Days", range: () => [iso(subDays(new Date(), 6)), iso(new Date())] },
  { key: "month", label: "This Month", range: () => [iso(startOfMonth(new Date())), iso(endOfMonth(new Date()))] },
  { key: "lastMonth", label: "Last Month", range: () => {
      const m = subMonths(new Date(), 1);
      return [iso(startOfMonth(m)), iso(endOfMonth(m))];
    } },
  { key: "last3", label: "Last 3 Months", range: () => [iso(startOfMonth(subMonths(new Date(), 2))), iso(endOfMonth(new Date()))] },
];

export const DEFAULT_RANGE_KEY = "today";

export function resolveRange(key, custom) {
  if (key === "custom" && custom?.[0] && custom?.[1]) return custom;
  const preset = RANGE_PRESETS.find((p) => p.key === key) || RANGE_PRESETS[0];
  return preset.range();
}

export function rangeLabel(key, custom) {
  if (key === "custom" && custom?.[0]) {
    return custom[1] && custom[1] !== custom[0] ? `${custom[0]} → ${custom[1]}` : custom[0];
  }
  return (RANGE_PRESETS.find((p) => p.key === key) || RANGE_PRESETS[0]).label;
}
