import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import DateField from "@/components/ui/DateField";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Hours logged per top-level item on a job.
 *
 * `tasks_hours_summary` comes back with the job detail and already has child
 * hours rolled up into their parent, so these totals are complete — no need to
 * expand anything. `total_hours` is SECONDS despite the name.
 *
 * The date filter re-fetches the job with summary_start_date / summary_end_date,
 * which is the only way to scope these numbers (it's computed server-side).
 */
const JobHoursSummary = ({ summary = [], range, onRangeChange, isFetching }) => {
  const [showFilter, setShowFilter] = useState(Boolean(range?.start || range?.end));

  const rows = useMemo(
    () => [...summary].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0)),
    [summary]
  );

  const grandTotal = rows.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
  const max = rows.length ? Math.max(...rows.map((r) => Number(r.total_hours) || 0)) : 0;
  const hasFilter = Boolean(range?.start || range?.end);

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
          <Icon icon="solar:stopwatch-bold-duotone" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Time logged</span>
        <span className={cn("text-[11px] text-[var(--ink-tertiary)] transition-opacity", isFetching && "opacity-40")}>
          {formatDuration(grandTotal)} total
        </span>
        <Button
          size="xs"
          variant={hasFilter ? "primary" : "secondary"}
          icon="solar:filter-linear"
          onClick={() => setShowFilter((s) => !s)}
        >
          {hasFilter ? "Filtered" : "Dates"}
        </Button>
      </div>

      {showFilter && (
        <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-[var(--line-subtle)] bg-[var(--surface-sunken)]">
          <div className="min-w-[9.5rem]">
            <label className="block text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)] mb-1">From</label>
            <DateField value={range?.start || null} onChange={(d) => onRangeChange({ ...range, start: d })} />
          </div>
          <div className="min-w-[9.5rem]">
            <label className="block text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)] mb-1">To</label>
            <DateField value={range?.end || null} onChange={(d) => onRangeChange({ ...range, end: d })} align="right" />
          </div>
          {hasFilter && (
            <Button size="sm" variant="ghost" onClick={() => onRangeChange({ start: null, end: null })}>
              Clear
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] px-4 py-6 text-center">
          {hasFilter ? "No time logged in this date range." : "No time logged on this job yet."}
        </p>
      ) : (
        <div className={cn("divide-y divide-[var(--line-subtle)] transition-opacity", isFetching && "opacity-60")}>
          {rows.map((r) => {
            const secs = Number(r.total_hours) || 0;
            const pct = max > 0 ? (secs / max) * 100 : 0;
            return (
              <div key={r.task_id} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-[var(--ink-primary)] truncate" title={r.task_title}>
                    {r.task_title}
                  </span>
                  <span className={cn("text-xs font-semibold flex-none", secs > 0 ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]")}>
                    {r.total_hours_formatted || formatDuration(secs)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden mt-1.5">
                  <motion.div
                    className="h-full rounded-full bg-primary-500"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobHoursSummary;
