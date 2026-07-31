import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import SearchSelect from "@/components/ui/SearchSelect";
import DatePicker from "@/components/ui/DatePicker";
import BottomSheet from "@/components/ui/BottomSheet";
import { fetchProjects, fetchProject } from "@/api/projects";
import { useAuth } from "@/auth/AuthContext";
import { RANGE_PRESETS } from "../dateRanges";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Date range + Job / Project / Task filters, shared by the personal and
 * per-employee diaries.
 *
 * Terminology note (matches the rest of the UI): a backend `project` is a
 * "Job"; a root task is a "Project"; a child task is a "Task". The work-session
 * API filters by `project_id` (the job) and `task_id` — and a task_id filter
 * covers that task's own sessions, so picking a Project narrows to it.
 *
 * MOBILE (desktop layout below `sm:` is unchanged):
 * Eight date pills plus three selects plus two actions is roughly four rows of
 * controls before you see a single session. So on a phone this collapses to one
 * row — [ current range ▾ ] [ Filters ² ] — with everything behind two sheets.
 * Active job/project/task choices still surface as removable chips, so a
 * narrowed list never looks like an empty one.
 */
const DiaryFilterBar = ({
  rangeKey, onRangeKey,
  customRange, onCustomRange,
  jobId, onJobId,
  taskId, onTaskId,
  right,
  mobileActions,
}) => {
  const { user } = useAuth();
  const [dateSheet, setDateSheet] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["diary-jobs", user?.role],
    queryFn: () => fetchProjects(user.role, {}),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  // all_tasks is the flat list (roots + children) for the picked job.
  const { data: jobDetail } = useQuery({
    queryKey: ["diary-job-tasks", user?.role, jobId],
    queryFn: () => fetchProject(user.role, jobId),
    enabled: Boolean(user) && Boolean(jobId),
    staleTime: 5 * 60_000,
  });

  const jobOptions = useMemo(
    () => jobs.map((j) => ({ value: j.id, label: j.project_name, sublabel: j.customer?.name })),
    [jobs]
  );

  const { projectOptions, taskOptions } = useMemo(() => {
    const all = jobDetail?.all_tasks || [];
    const roots = all.filter((t) => !t.parent_task_id);
    const children = all.filter((t) => t.parent_task_id);
    const titleById = new Map(all.map((t) => [t.id, t.task_title]));
    return {
      projectOptions: roots.map((t) => ({ value: t.id, label: t.task_title })),
      taskOptions: children.map((t) => ({
        value: t.id,
        label: t.task_title,
        sublabel: titleById.get(t.parent_task_id) || undefined,
      })),
    };
  }, [jobDetail]);

  const isCustom = rangeKey === "custom";
  const activeCount = (jobId ? 1 : 0) + (taskId ? 1 : 0);
  const rangeLabelShort =
    isCustom && customRange?.[0]
      ? `${formatDate(customRange[0])}${customRange?.[1] ? ` – ${formatDate(customRange[1])}` : ""}`
      : RANGE_PRESETS.find((p) => p.key === rangeKey)?.label || "Today";

  const labelFor = (opts, id) => opts.find((o) => o.value === id)?.label;
  const chips = [
    jobId && { key: "job", label: labelFor(jobOptions, jobId) || "Job", onRemove: () => { onJobId(null); onTaskId(null); } },
    taskId && {
      key: "task",
      label: labelFor(projectOptions, taskId) || labelFor(taskOptions, taskId) || "Task",
      onRemove: () => onTaskId(null),
    },
  ].filter(Boolean);

  const clearAll = () => { onJobId(null); onTaskId(null); };

  /* ---------------- shared select group (used inline + inside the sheet) ---------------- */
  const selects = (compact) => (
    <>
      <SearchSelect
        size={compact ? "sm" : "lg"}
        options={jobOptions}
        value={jobId}
        onChange={(v) => { onJobId(v); onTaskId(null); }}
        placeholder="All jobs"
        searchPlaceholder="Search jobs…"
        clearable
      />
      <SearchSelect
        size={compact ? "sm" : "lg"}
        options={projectOptions}
        value={projectOptions.some((o) => o.value === taskId) ? taskId : null}
        onChange={(v) => onTaskId(v)}
        placeholder={jobId ? "All projects" : "Pick a job first"}
        searchPlaceholder="Search projects…"
        disabled={!jobId}
        clearable
        emptyText="No projects in this job"
      />
      <SearchSelect
        size={compact ? "sm" : "lg"}
        options={taskOptions}
        value={taskOptions.some((o) => o.value === taskId) ? taskId : null}
        onChange={(v) => onTaskId(v)}
        placeholder={jobId ? "All tasks" : "Pick a job first"}
        searchPlaceholder="Search tasks…"
        disabled={!jobId}
        clearable
        emptyText="No sub-tasks in this job"
      />
    </>
  );

  const customPickers = (
    <div className="flex items-center gap-2">
      <DatePicker
        value={customRange?.[0] || ""}
        onChange={(d) => { onCustomRange([d, customRange?.[1] || d]); onRangeKey("custom"); }}
        anchorClassName="flex flex-1 min-w-0"
        trigger={
          <span className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm cursor-pointer">
            <Icon icon="solar:calendar-linear" className="text-primary-500 text-[15px]" />
            {customRange?.[0] ? formatDate(customRange[0]) : "Start date"}
          </span>
        }
      />
      <span className="text-xs text-[var(--ink-tertiary)]">→</span>
      <DatePicker
        value={customRange?.[1] || ""}
        onChange={(d) => onCustomRange([customRange?.[0] || d, d])}
        align="right"
        anchorClassName="flex flex-1 min-w-0"
        trigger={
          <span className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm cursor-pointer">
            <Icon icon="solar:calendar-linear" className="text-primary-500 text-[15px]" />
            {customRange?.[1] ? formatDate(customRange[1]) : "End date"}
          </span>
        }
      />
    </div>
  );

  return (
    <>
      {/* ============================ MOBILE ============================ */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateSheet(true)}
            className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] flex items-center gap-2 text-sm"
          >
            <Icon icon="solar:calendar-linear" className="text-[15px] text-primary-500 flex-none" />
            <span className="truncate font-medium text-[var(--ink-primary)]">{rangeLabelShort}</span>
            <Icon icon="solar:alt-arrow-down-linear" className="text-[13px] text-[var(--ink-tertiary)] ml-auto flex-none" />
          </button>

          <button
            type="button"
            onClick={() => setFilterSheet(true)}
            className={cn(
              "relative h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-1.5 flex-none transition-colors",
              activeCount > 0
                ? "border-primary-400 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)]"
            )}
          >
            <Icon icon="solar:filter-linear" className="text-[16px]" />
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {mobileActions}
        </div>

        {chips.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.onRemove}
                className="flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-primary-500/10 text-primary-700 dark:text-primary-300 text-[11px] font-medium flex-none max-w-[60vw]"
              >
                <span className="truncate">{c.label}</span>
                <Icon icon="solar:close-circle-linear" className="text-[13px] flex-none" />
              </button>
            ))}
          </div>
        )}

        {/* Date sheet — presets as a two-column grid: one tap, no horizontal hunting. */}
        <BottomSheet open={dateSheet} onClose={() => setDateSheet(false)} title="Date range">
          <div className="grid grid-cols-2 gap-2">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { onRangeKey(p.key); if (p.key !== "custom") setDateSheet(false); }}
                className={cn(
                  "h-11 rounded-xl text-sm font-medium transition-colors",
                  rangeKey === p.key
                    ? "bg-primary-500 text-white"
                    : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)] mb-2">Custom range</p>
            {customPickers}
          </div>
        </BottomSheet>

        {/* Filter sheet — full-size selects, plenty of tap area. */}
        <BottomSheet
          open={filterSheet}
          onClose={() => setFilterSheet(false)}
          title="Filter sessions"
          subtitle="Narrow the diary to a job, project or task"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={clearAll} disabled={activeCount === 0}>
                Clear
              </Button>
              <Button className="flex-1" onClick={() => setFilterSheet(false)}>Show results</Button>
            </div>
          }
        >
          <div className="space-y-3 pt-1">{selects(false)}</div>
        </BottomSheet>
      </div>

      {/* ============================ DESKTOP (unchanged) ============================ */}
      <div className="hidden sm:block rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => onRangeKey(p.key)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                rangeKey === p.key
                  ? "bg-primary-500 text-white"
                  : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
            >
              {p.label}
            </button>
          ))}

          <div className="flex items-center gap-1">
            <DatePicker
              value={customRange?.[0] || ""}
              onChange={(d) => { onCustomRange([d, customRange?.[1] || d]); onRangeKey("custom"); }}
              trigger={
                <span className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors",
                  isCustom ? "bg-primary-500 text-white" : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}>
                  <Icon icon="solar:calendar-linear" className="text-[13px]" />
                  {isCustom && customRange?.[0] ? formatDate(customRange[0]) : "Custom"}
                </span>
              }
            />
            {isCustom && (
              <>
                <span className="text-xs text-[var(--ink-tertiary)]">→</span>
                <DatePicker
                  value={customRange?.[1] || ""}
                  onChange={(d) => onCustomRange([customRange?.[0] || d, d])}
                  align="right"
                  trigger={
                    <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-sunken)] text-[var(--ink-secondary)] flex items-center gap-1.5 cursor-pointer">
                      {customRange?.[1] ? formatDate(customRange[1]) : "End date"}
                    </span>
                  }
                />
              </>
            )}
          </div>

          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{selects(true)}</div>
      </div>
    </>
  );
};

export default DiaryFilterBar;
