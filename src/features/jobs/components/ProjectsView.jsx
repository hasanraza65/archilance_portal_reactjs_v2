import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Button from "@/components/ui/Button";
import AvatarStack from "@/components/ui/AvatarStack";
import DueDatePill from "@/components/ui/DueDatePill";
import StatusMenu from "./StatusMenu";
import { useProjectsWithTasksPage, useUpdateTaskField, useDeleteTask } from "../useJobsData";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import { useAuth } from "@/auth/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";

/**
 * Cross-job flat task list — v1's "Projects" tab (pages/app/projects/TaskList.jsx),
 * distinct from v2's "Jobs" tab which lists jobs, not individual tasks. Backed
 * by `/projects-with-tasks`, fetched one status bucket at a time exactly like
 * v1: each status is its own paginated accordion section, only queried once
 * expanded.
 */

// v1 gates its own "Assigned to me" toggle on this tab to non-admin
// employee-ish roles (TaskList.jsx: `userRole !== "admin" &&
// employeeType in [Manager, Supervisor, Executive, Employee]`) — notably
// wider than the Jobs tab's toggle (which excludes plain "Employee").
const ASSIGNED_ME_ROLES = ["manager", "supervisor", "executive", "employee"];

const TaskRow = React.memo(({ task, onOpenTask, onField, onDelete }) => {
  const isCompleted = task.task_status?.toLowerCase() === "completed";
  return (
    <div className="group flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--surface-sunken)] transition-colors">
      <button type="button" onClick={() => onOpenTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] text-[var(--ink-tertiary)] truncate">
          {task.projectName || "—"}
          {task.parentTaskTitle ? ` › ${task.parentTaskTitle}` : ""}
        </span>
        <span
          className={cn(
            "block text-[13px] font-medium text-[var(--ink-primary)] truncate hover:text-primary-600 dark:hover:text-primary-400",
            isCompleted && "line-through text-[var(--ink-tertiary)]"
          )}
        >
          {task.isSubtask && <span className="text-[var(--ink-tertiary)] font-normal">↳ </span>}
          {task.task_title}
        </span>
      </button>
      <div className="hidden sm:block flex-none">
        <AvatarStack people={(task.assignees || []).map((a) => a.user).filter(Boolean)} size="xs" max={3} />
      </div>
      <div className="hidden sm:block flex-none">
        <DueDatePill date={task.due_date} status={task.task_status} onChange={(v) => onField(task.id, "dueDate", v)} />
      </div>
      <div className="flex-none w-[104px]">
        <StatusMenu status={task.task_status} onChange={(v) => onField(task.id, "status", v)} />
      </div>
      <IconButton
        icon="solar:trash-bin-trash-linear"
        size="xs"
        variant="danger"
        label="Delete"
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(task.id)}
      />
    </div>
  );
});
TaskRow.displayName = "TaskRow";

const StatusSection = ({ status, expanded, onToggle, assignedMe, search, onOpenTask, onField, onDelete }) => {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useProjectsWithTasksPage(status.value, {
    assignedMe,
    enabled: expanded,
  });

  const items = useMemo(() => (data?.pages || []).flatMap((p) => p.items), [data]);
  const total = data?.pages?.[0]?.total ?? items.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.projectName?.toLowerCase().includes(q) ||
        t.parentTaskTitle?.toLowerCase().includes(q) ||
        t.task_title?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3.5 py-3 hover:bg-[var(--surface-sunken)] transition-colors"
      >
        <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="text-[var(--ink-tertiary)] flex-none">
          <Icon icon="solar:alt-arrow-right-bold" className="text-[13px]" />
        </motion.span>
        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: status.color }} />
        <span className="text-sm font-semibold text-[var(--ink-primary)]">{status.label}</span>
        {expanded && !isLoading && <span className="text-xs text-[var(--ink-tertiary)]">{total}</span>}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[var(--line-subtle)]"
          >
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-[var(--ink-tertiary)] py-4 px-3.5">
                {search ? "No tasks match your search." : "No tasks in this status."}
              </p>
            ) : (
              <div className="divide-y divide-[var(--line-subtle)]">
                {filtered.map((t) => (
                  <TaskRow key={`${t.isSubtask ? "sub" : "root"}-${t.id}`} task={t} onOpenTask={onOpenTask} onField={onField} onDelete={onDelete} />
                ))}
              </div>
            )}

            {hasNextPage && !search && (
              <div className="flex justify-center p-2.5 border-t border-[var(--line-subtle)]">
                <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProjectsView = ({ onOpenTask }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canToggleAssignedMe = ASSIGNED_ME_ROLES.includes(user?.role);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [assignedMe, setAssignedMe] = useState(false);
  // On Hold opens by default — matches v1's TaskList.jsx initial section.
  const [expanded, setExpanded] = useState({ "On Hold": true });

  const updateField = useUpdateTaskField();
  const deleteTaskMut = useDeleteTask();

  const toggleSection = (value) => setExpanded((e) => ({ ...e, [value]: !e[value] }));
  const onField = (taskId, field, value) => updateField.mutate({ taskId, field, value });
  const onDelete = (taskId) => deleteTaskMut.mutate(taskId);
  const openTask = onOpenTask || ((taskId) => navigate(`/jobs/task/${taskId}`));

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or tasks…"
            className="w-full pl-8 pr-3 h-10 sm:h-9 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        {canToggleAssignedMe && (
          <Button
            variant={assignedMe ? "primary" : "secondary"}
            size="sm"
            className="flex-none"
            onClick={() => setAssignedMe((v) => !v)}
          >
            Assigned to me
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {STATUS_OPTIONS.map((status) => (
          <StatusSection
            key={status.value}
            status={status}
            expanded={Boolean(expanded[status.value])}
            onToggle={() => toggleSection(status.value)}
            assignedMe={assignedMe}
            search={debouncedSearch}
            onOpenTask={openTask}
            onField={onField}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectsView;
