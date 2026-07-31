import React, { useMemo, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, format, parseISO,
} from "date-fns";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";

import { useJobRootTasks } from "../useJobsData";
import EmptyState from "@/components/ui/EmptyState";
import { isCompletedStatus } from "@/lib/statusMeta";
import { cn } from "@/lib/cn";
import JobPicker from "./JobPicker";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Calendar is scoped to one job at a time (same convention as Board) — shows
 * that job's top-level tasks placed by due date. */
const CalendarView = ({ jobs = [], selectedJobId, onSelectJob, onOpenTask }) => {
  const activeJobId = selectedJobId || jobs[0]?.id;
  const { data: tasks, isLoading } = useJobRootTasks(activeJobId, Boolean(activeJobId));
  const [viewMonth, setViewMonth] = useState(new Date());

  const tasksByDay = useMemo(() => {
    const map = new Map();
    for (const t of tasks || []) {
      if (!t.due_date) continue;
      const key = format(parseISO(t.due_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  if (!jobs.length) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <JobPicker jobs={jobs} value={activeJobId} onChange={onSelectJob} placeholder="Choose a job…" />
        <div className="flex items-center gap-2">
          <IconButton icon="solar:alt-arrow-left-linear" size="sm" onClick={() => setViewMonth((m) => subMonths(m, 1))} />
          <span className="text-sm font-semibold w-32 text-center">{format(viewMonth, "MMMM yyyy")}</span>
          <IconButton icon="solar:alt-arrow-right-linear" size="sm" onClick={() => setViewMonth((m) => addMonths(m, 1))} />
          <button onClick={() => setViewMonth(new Date())} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline ml-1">Today</button>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : !tasks?.length ? (
        <EmptyState icon="solar:calendar-linear" title="No tasks with due dates" description="Set due dates on tasks in the List view to see them here." />
      ) : (
        <div className="rounded-2xl border border-[var(--line-subtle)] overflow-hidden bg-[var(--surface-raised)]">
          <div className="grid grid-cols-7 border-b border-[var(--line-subtle)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDay.get(key) || [];
              const inMonth = isSameMonth(day, viewMonth);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[104px] border-b border-r border-[var(--line-subtle)] p-1.5 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-[var(--surface-sunken)]/40"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1",
                      isToday(day) ? "bg-primary-500 text-white" : inMonth ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onOpenTask(t.id)}
                        className={cn(
                          "w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-[10.5px] text-left truncate bg-primary-500/10 text-primary-700 dark:text-primary-400 hover:bg-primary-500/20 transition-colors",
                          isCompletedStatus(t.task_status) && "line-through opacity-60"
                        )}
                      >
                        {t.priority === "Urgent" && <Icon icon="solar:fire-bold" className="text-priority-urgent text-[10px] flex-none" />}
                        <span className="truncate">{t.task_title}</span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-[var(--ink-tertiary)] pl-1.5">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
