import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import { PriorityPill } from "@/components/ui/StatusPill";
import AvatarStack from "@/components/ui/AvatarStack";
import { formatRelativeDue, isOverdue } from "@/lib/format";
import { isCompletedStatus } from "@/lib/statusMeta";
import { cn } from "@/lib/cn";

/** Compact task list used across dashboard panels. */
const TaskListCard = ({ title, icon, tasks = [], emptyText = "Nothing here — nice.", accent = "#6d5ef8", max = 6, action }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md flex items-center justify-center flex-none" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
          <Icon icon={icon} className="text-[13px]" style={{ color: accent }} />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">{title}</span>
        <span className="text-xs text-[var(--ink-tertiary)]">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] px-4 py-6 text-center">{emptyText}</p>
      ) : (
        <div className="divide-y divide-[var(--line-subtle)]">
          {tasks.slice(0, max).map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/jobs/task/${t.id}`)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-[var(--surface-sunken)] transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <span className={cn("block text-[13px] font-medium truncate text-[var(--ink-primary)] group-hover:text-primary-600 dark:group-hover:text-primary-400", isCompletedStatus(t.task_status) && "line-through text-[var(--ink-tertiary)]")}>
                  {t.task_title}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-tertiary)] truncate">
                  {t.__job?.project_name || t.project?.project_name}
                  {t.due_date && (
                    <>
                      <span>·</span>
                      <span className={cn(isOverdue(t.due_date, isCompletedStatus(t.task_status)) && "text-danger-500 font-medium")}>
                        {formatRelativeDue(t.due_date)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              {t.priority && <PriorityPill priority={t.priority} showLabel={false} />}
              <AvatarStack people={(t.assignees || []).map((a) => a.user).filter(Boolean)} size="xs" max={2} />
            </button>
          ))}
        </div>
      )}

      {action && tasks.length > max && (
        <button onClick={action.onClick} className="text-[11px] font-medium text-primary-600 dark:text-primary-400 py-2 border-t border-[var(--line-subtle)] hover:bg-[var(--surface-sunken)] transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
};

export default TaskListCard;
