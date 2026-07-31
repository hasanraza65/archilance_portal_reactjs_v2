import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import SearchSelect from "@/components/ui/SearchSelect";
import DatePicker from "@/components/ui/DatePicker";
import { useUI } from "@/store/UIContext";
import { useAuth } from "@/auth/AuthContext";
import { useJobs, useJobRootTasks, useCreateTask } from "@/features/jobs/useJobsData";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import { PRIORITY_OPTIONS } from "@/lib/statusMeta";
import { getMediaUrl } from "@/api/media";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

/**
 * The topbar "New" action. Creates a task (optionally a sub-task) in any job
 * the user can see, with assignees / due date / priority set up-front.
 */
const QuickCreateModal = () => {
  const { quickCreateOpen, setQuickCreateOpen } = useUI();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: jobs = [] } = useJobs({ assignedMe: user?.role === "manager" });
  const { data: employees = [] } = useAllEmployees();
  const createTask = useCreateTask();

  const [jobId, setJobId] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [priority, setPriority] = useState(null);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [assigneeQuery, setAssigneeQuery] = useState("");

  const { data: parentOptions = [] } = useJobRootTasks(jobId, Boolean(jobId));

  useEffect(() => {
    if (!quickCreateOpen) {
      setJobId(null); setParentId(null); setTitle("");
      setDueDate(null); setPriority(null); setAssigneeIds([]); setAssigneeQuery("");
    }
  }, [quickCreateOpen]);

  const jobOptions = useMemo(
    () => jobs.map((j) => ({ value: j.id, label: j.project_name, sublabel: j.customer?.name })),
    [jobs]
  );
  const taskOptions = useMemo(
    () => [{ value: "", label: "— None (top-level task)" }, ...parentOptions.map((t) => ({ value: t.id, label: t.task_title }))],
    [parentOptions]
  );
  const priorityOptions = useMemo(
    () => PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label, color: p.color })),
    []
  );

  const toggleAssignee = (id) =>
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Selected people first, then search matches. With a 70-person roster an
  // unsearchable, unsorted list means scrolling to find anyone — and the ones
  // you already picked scroll out of sight while you look.
  const visibleEmployees = useMemo(() => {
    const q = assigneeQuery.trim().toLowerCase();
    const matches = (e) =>
      !q || [e.name, e.email, e.employee_type].some((v) => String(v || "").toLowerCase().includes(q));
    const picked = employees.filter((e) => assigneeIds.includes(e.id) && matches(e));
    const rest = employees.filter((e) => !assigneeIds.includes(e.id) && matches(e));
    return [...picked, ...rest];
  }, [employees, assigneeIds, assigneeQuery]);

  const submit = async (e) => {
    e.preventDefault();
    if (!jobId) return toast.error("Please choose a job.");
    if (!title.trim()) return toast.error("Please enter a task title.");
    try {
      const created = await createTask.mutateAsync({
        projectId: jobId,
        parentTaskId: parentId || undefined,
        title: title.trim(),
        dueDate: dueDate || undefined,
        employeeIds: assigneeIds,
      });
      toast.success("Task created.");
      setQuickCreateOpen(false);
      if (created?.id) navigate(`/jobs/task/${created.id}`);
      else navigate(`/jobs/${jobId}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't create the task."));
    }
  };

  return (
    <Modal
      open={quickCreateOpen}
      onClose={() => setQuickCreateOpen(false)}
      title="Create a task"
      className="max-w-lg"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setQuickCreateOpen(false)}>Cancel</Button>
          <Button type="submit" form="quick-create-form" icon="solar:add-circle-bold" isLoading={createTask.isPending} className="flex-1 sm:flex-none">Create task</Button>
        </div>
      }
    >
      <form id="quick-create-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Job</label>
          <SearchSelect
            options={jobOptions}
            value={jobId}
            onChange={(v) => { setJobId(v); setParentId(null); }}
            placeholder="Choose a job…"
            searchPlaceholder="Search jobs…"
          />
        </div>

        {jobId && parentOptions.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Parent task (optional)</label>
            <SearchSelect
              options={taskOptions}
              value={parentId ?? ""}
              onChange={(v) => setParentId(v || null)}
              placeholder="Top-level task"
              searchPlaceholder="Search tasks…"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full h-11 sm:h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Due date</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              anchorClassName="flex w-full"
              trigger={
                <span className="w-full flex items-center justify-between px-3 h-10 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm cursor-pointer">
                  <span className={dueDate ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]"}>
                    {dueDate ? formatDate(dueDate) : "Optional"}
                  </span>
                  <Icon icon="solar:calendar-linear" className="text-[var(--ink-tertiary)] text-[14px]" />
                </span>
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Priority</label>
            <SearchSelect
              options={priorityOptions}
              value={priority}
              onChange={setPriority}
              placeholder="Optional"
              searchPlaceholder="Search…"
              clearable
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">
            Assignees {assigneeIds.length > 0 && <span className="text-[var(--ink-tertiary)] font-normal">({assigneeIds.length})</span>}
          </label>
          <div className="rounded-lg border border-[var(--line-subtle)] overflow-hidden">
            <div className="relative border-b border-[var(--line-subtle)]">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px] pointer-events-none" />
              <input
                value={assigneeQuery}
                onChange={(ev) => setAssigneeQuery(ev.target.value)}
                placeholder="Search people…"
                className="w-full h-10 pl-9 pr-3 bg-transparent text-[16px] sm:text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-44 overflow-y-auto p-1">
            {employees.length === 0 ? (
              <p className="text-xs text-[var(--ink-tertiary)] text-center py-3">Loading people…</p>
            ) : visibleEmployees.length === 0 ? (
              <p className="text-xs text-[var(--ink-tertiary)] text-center py-3">Nobody matches "{assigneeQuery}".</p>
            ) : (
              visibleEmployees.map((e) => {
                const checked = assigneeIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggleAssignee(e.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors",
                      checked ? "bg-primary-50 dark:bg-primary-500/10" : "hover:bg-[var(--surface-sunken)]"
                    )}
                  >
                    <Avatar name={e.name} src={e.profile_pic ? getMediaUrl(e.profile_pic) : null} size="xs" />
                    <span className="flex-1 min-w-0 text-[13px] truncate text-[var(--ink-primary)]">{e.name}</span>
                    <span className={cn("w-4 h-4 rounded border flex items-center justify-center flex-none", checked ? "bg-primary-500 border-primary-500" : "border-[var(--line-strong)]")}>
                      {checked && <Icon icon="solar:check-read-linear" className="text-white text-[10px]" />}
                    </span>
                  </button>
                );
              })
            )}
            </div>
          </div>
        </div>

      </form>
    </Modal>
  );
};

export default QuickCreateModal;
