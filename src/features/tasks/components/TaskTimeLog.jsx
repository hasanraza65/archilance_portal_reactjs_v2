import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { getMediaUrl } from "@/api/media";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Hours each assignee has logged against this task.
 *
 * `assignees_with_hours` comes back with the task detail. `total_working_hours`
 * is SECONDS and is already net of idle time — the backend merges overlapping
 * idle rows and clamps them per session, so these figures match the work diary
 * rather than raw session length.
 */
const TaskTimeLog = ({ task }) => {
  const rows = task?.assignees_with_hours || [];

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.total_working_hours || 0) - (a.total_working_hours || 0)),
    [rows]
  );

  const total = sorted.reduce((sum, r) => sum + (Number(r.total_working_hours) || 0), 0);
  const max = sorted.length ? Math.max(...sorted.map((r) => Number(r.total_working_hours) || 0)) : 0;

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
          <Icon icon="solar:clock-circle-bold-duotone" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Time logged</span>
        <span className="text-[11px] text-[var(--ink-tertiary)]">{formatDuration(total)}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] px-4 py-5 text-center">
          Nobody has tracked time against this task yet.
        </p>
      ) : (
        <div className="divide-y divide-[var(--line-subtle)]">
          {sorted.map((r, i) => {
            const secs = Number(r.total_working_hours) || 0;
            const pct = max > 0 ? (secs / max) * 100 : 0;
            const person = r.user || r.assignee?.user;
            return (
              <div key={person?.id ?? i} className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={person?.name}
                    src={person?.profile_pic ? getMediaUrl(person.profile_pic) : null}
                    size="xs"
                  />
                  <span className="text-[13px] text-[var(--ink-primary)] truncate flex-1">
                    {person?.name || "Unknown"}
                  </span>
                  <span className={cn("text-xs font-semibold flex-none", secs > 0 ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]")}>
                    {r.total_working_hours_formatted || formatDuration(secs)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden mt-1.5 ml-[26px]">
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

export default TaskTimeLog;
