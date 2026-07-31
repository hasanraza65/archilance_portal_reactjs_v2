import React, { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import AvatarStack from "@/components/ui/AvatarStack";
import { StatusPill, PriorityPill } from "@/components/ui/StatusPill";
import DueDatePill from "@/components/ui/DueDatePill";
import EmptyState from "@/components/ui/EmptyState";
import { useJobRootTasks, useUpdateTaskField } from "../useJobsData";

import { cn } from "@/lib/cn";
import JobPicker from "./JobPicker";


const COLUMNS = [
  { key: "task_title", label: "Task" },
  { key: "task_status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignees", label: "Assignees" },
  { key: "due_date", label: "Due" },
];

const TableView = ({ jobs = [], selectedJobId, onSelectJob, onOpenTask }) => {
  const activeJobId = selectedJobId || jobs[0]?.id;
  const { data: tasks, isLoading } = useJobRootTasks(activeJobId, Boolean(activeJobId));
  const updateField = useUpdateTaskField();
  const [sortKey, setSortKey] = useState("due_date");
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    const list = [...(tasks || [])];
    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "due_date") { av = av ? new Date(av).getTime() : Infinity; bv = bv ? new Date(bv).getTime() : Infinity; }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [tasks, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (!jobs.length) return null;

  return (
    <div>
      <div className="mb-4">
        <JobPicker jobs={jobs} value={activeJobId} onChange={onSelectJob} placeholder="Choose a job…" />
      </div>

      {isLoading ? (
        <div className="skeleton h-80 rounded-2xl" />
      ) : !tasks?.length ? (
        <EmptyState icon="solar:widget-linear" title="No tasks in this job yet" />
      ) : (
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-subtle)]">
                {COLUMNS.map((c) => (
                  <th key={c.key} className="text-left px-4 py-3">
                    <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]">
                      {c.label}
                      {sortKey === c.key && <Icon icon={sortDir === "asc" ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} className="text-[11px]" />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-subtle)]">
              {sorted.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--surface-sunken)] transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => onOpenTask(t.id)} className={cn("font-medium text-[var(--ink-primary)] hover:text-primary-600 dark:hover:text-primary-400 text-left", t.task_status?.toLowerCase() === "completed" && "line-through text-[var(--ink-tertiary)]")}>
                      {t.task_title}
                    </button>
                    {(t.sub_tasks_count ?? 0) > 0 && (
                      <span className="ml-2 text-[10px] font-semibold text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-1.5 py-0.5">{t.sub_tasks_count}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={t.task_status} onClick={() => updateField.mutate({ taskId: t.id, field: "status", value: t.task_status?.toLowerCase() === "completed" ? "In Progress" : "Completed" })} /></td>
                  <td className="px-4 py-3"><PriorityPill priority={t.priority} /></td>
                  <td className="px-4 py-3"><AvatarStack people={(t.assignees || []).map((a) => a.user).filter(Boolean)} size="xs" /></td>
                  <td className="px-4 py-3"><DueDatePill date={t.due_date} status={t.task_status} editable={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TableView;
