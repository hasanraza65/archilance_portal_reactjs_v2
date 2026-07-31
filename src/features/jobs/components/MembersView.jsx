import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import StatusMenu from "./StatusMenu";
import DueDatePill from "@/components/ui/DueDatePill";
import TaskTreeRow from "./TaskTreeRow";
import { useProjectsWithMembers, useUpdateTaskField, useDeleteTask } from "../useJobsData";
import { useDebounce } from "@/hooks/useDebounce";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

/**
 * Cross-project, per-employee task breakdown.
 *
 * PERFORMANCE — this view holds the largest dataset in the app (~70 people,
 * ~2,300 tasks). Searching it used to lock the page up on every keystroke:
 *
 *   1. the parent re-filtered every task, lowercasing three fields each time;
 *   2. every MemberCard then re-ran the same filter again for itself;
 *   3. worst of all, `defaultOpen` was true whenever the box was non-empty, so
 *      the first character EXPANDED EVERY MATCHING CARD — mounting thousands of
 *      rows, each with a Headless UI menu, a date picker and a motion wrapper.
 *
 * Now: the query is debounced, match text is pre-flattened once per data load
 * (so a keystroke is a plain indexOf), the parent hands each card a finished
 * list, cards are memoised, and long lists render a capped slice with a
 * "show all" toggle. Auto-expand only kicks in once results are actually few.
 */

const AUTO_EXPAND_MAX = 4; // expand on search only when the result set is small
const ROWS_PER_GROUP = 25; // render cap per status bucket, with a reveal button

/** One lowercase haystack per record, built once — not per keystroke. */
function buildIndex(members) {
  return (members || []).map((member) => ({
    member,
    personBlob: `${member.name || ""} ${member.email || ""}`.toLowerCase(),
    buckets: STATUS_OPTIONS.map((status) => {
      const tasks = member.tasks_by_status?.[status.value]?.tasks || [];
      return {
        status,
        tasks,
        blobs: tasks.map((t) =>
          `${t.task_title || ""} ${t.project?.project_name || ""} ${t.parent_task?.task_title || ""}`.toLowerCase()
        ),
      };
    }),
  }));
}

const TaskRow = React.memo(({ task, onOpenTask, onField, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const isSubtask = Boolean(task.parent_task);

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--surface-sunken)] transition-colors group">
        {(task.sub_tasks_count ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-5 h-5 flex-none flex items-center justify-center rounded-md text-[var(--ink-tertiary)]"
          >
            <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <Icon icon="solar:alt-arrow-right-bold" className="text-[11px]" />
            </motion.span>
          </button>
        )}
        <button type="button" onClick={() => onOpenTask(task.id)} className="min-w-0 flex-1 text-left">
          <span className="block text-[11px] text-[var(--ink-tertiary)] truncate">{task.project?.project_name || "—"}</span>
          <span className="block text-[13px] font-medium text-[var(--ink-primary)] truncate hover:text-primary-600 dark:hover:text-primary-400">
            {isSubtask && <span className="text-[var(--ink-tertiary)] font-normal">{task.parent_task.task_title} › </span>}
            {task.task_title}
          </span>
        </button>
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
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden bg-[var(--surface-sunken)]/50 pl-4 pr-1"
          >
            <TaskTreeRow task={task} depth={0} projectId={task.project?.id} onOpenTask={onOpenTask} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
TaskRow.displayName = "TaskRow";

const StatusGroup = ({ status, tasks, onOpenTask, onField, onDelete }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tasks : tasks.slice(0, ROWS_PER_GROUP);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: status.color }} />
        <span className="text-xs font-semibold text-[var(--ink-primary)]">{status.label}</span>
        <span className="text-[10px] text-[var(--ink-tertiary)]">{tasks.length}</span>
      </div>
      <div className="rounded-xl border border-[var(--line-subtle)] divide-y divide-[var(--line-subtle)] overflow-hidden">
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} onOpenTask={onOpenTask} onField={onField} onDelete={onDelete} />
        ))}
      </div>
      {tasks.length > visible.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full mt-1.5 py-1.5 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Show all {tasks.length}
        </button>
      )}
    </div>
  );
};

/** Receives a FINISHED group list — it does no filtering of its own. */
const MemberCard = React.memo(({ member, groups, total, autoOpen, onOpenTask }) => {
  const [open, setOpen] = useState(autoOpen);
  const updateField = useUpdateTaskField();
  const deleteTaskMut = useDeleteTask();

  useEffect(() => { setOpen(autoOpen); }, [autoOpen]);

  const onField = (taskId, field, value) => updateField.mutate({ taskId, field, value });
  const onDelete = (taskId) => deleteTaskMut.mutate(taskId);

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3.5 hover:bg-[var(--surface-sunken)] transition-colors"
      >
        <Avatar name={member.name} src={member.profile_pic ? getMediaUrl(member.profile_pic) : null} size="md" />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-[var(--ink-primary)] truncate">{member.name}</p>
          <p className="text-xs text-[var(--ink-tertiary)] truncate">{member.email}</p>
        </div>
        <span className="text-xs font-semibold text-[var(--ink-secondary)] bg-[var(--surface-sunken)] rounded-full px-2.5 py-1 flex-none">
          {total}<span className="hidden sm:inline"> task{total === 1 ? "" : "s"}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }} className="text-[var(--ink-tertiary)] flex-none">
          <Icon icon="solar:alt-arrow-down-linear" className="text-[15px]" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[var(--line-subtle)]"
          >
            <div className="p-2.5 sm:p-3 space-y-3">
              {groups.map(({ status, tasks }) => (
                <StatusGroup
                  key={status.value}
                  status={status}
                  tasks={tasks}
                  onOpenTask={onOpenTask}
                  onField={onField}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
MemberCard.displayName = "MemberCard";

const MembersView = ({ onOpenTask }) => {
  const { data: members, isLoading, isError } = useProjectsWithMembers();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState(null);

  // Built once per data load — the expensive part now happens off the keystroke path.
  const index = useMemo(() => buildIndex(members), [members]);

  const results = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const out = [];
    for (const entry of index) {
      // Matching the PERSON shows all their tasks; otherwise match individual tasks.
      const wholePerson = Boolean(q) && entry.personBlob.includes(q);
      const groups = [];
      let total = 0;
      for (const bucket of entry.buckets) {
        if (statusFilter && statusFilter !== bucket.status.value) continue;
        let tasks = bucket.tasks;
        if (q && !wholePerson) {
          tasks = bucket.tasks.filter((_, i) => bucket.blobs[i].includes(q));
        }
        if (tasks.length) {
          groups.push({ status: bucket.status, tasks });
          total += tasks.length;
        }
      }
      if (total > 0) out.push({ member: entry.member, groups, total });
    }
    return out;
  }, [index, statusFilter, debouncedSearch]);

  // Only auto-expand once a search has actually narrowed things down. Expanding
  // 70 cards at once is what made the first keystroke feel like a freeze.
  const autoOpen = Boolean(debouncedSearch.trim()) && results.length > 0 && results.length <= AUTO_EXPAND_MAX;

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;
  }
  if (isError) {
    return <EmptyState icon="solar:shield-user-linear" title="Not authorized" description="You don't have access to the Members view." />;
  }

  const searching = search.trim() !== debouncedSearch.trim();

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people, jobs or tasks…"
            className="w-full pl-8 pr-8 h-10 sm:h-9 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] p-1"
            >
              <Icon icon="solar:close-circle-linear" className="text-[15px]" />
            </button>
          )}
        </div>

        {/* One scrollable row on mobile — eight status pills wrapped to three
            rows and pushed the results off the screen. */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn("px-2.5 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-colors flex-none", !statusFilter ? "bg-primary-500 text-white" : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]")}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn("px-2.5 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-colors flex-none whitespace-nowrap", statusFilter === s.value ? "text-white" : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]")}
              style={statusFilter === s.value ? { background: s.color } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("transition-opacity", searching && "opacity-60")}>
        {results.length === 0 ? (
          <EmptyState
            icon="solar:users-group-rounded-linear"
            title={members?.length ? "No matching tasks" : "No members with tasks"}
            description={members?.length ? "Try a different search or status filter." : undefined}
          />
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <MemberCard
                key={r.member.id}
                member={r.member}
                groups={r.groups}
                total={r.total}
                autoOpen={autoOpen}
                onOpenTask={onOpenTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersView;
