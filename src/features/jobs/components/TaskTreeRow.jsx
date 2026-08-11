import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import Menu from "@/components/ui/Menu";
import IconButton from "@/components/ui/IconButton";
import DueDatePill from "@/components/ui/DueDatePill";
import SmartSyncBanner from "@/components/ui/SmartSyncBanner";
import InlineAddField from "@/components/ui/InlineAddField";
import TaskStatusGroups from "./TaskStatusGroups";
import StatusMenu from "./StatusMenu";
import PriorityMenu from "./PriorityMenu";
import AssigneePicker from "./AssigneePicker";
import { useTaskChildren, useUpdateTaskField, useDeleteTask, useSetTaskAssignees, useCreateTask } from "../useJobsData";
import { isCompletedStatus, priorityMeta } from "@/lib/statusMeta";
import { formatDuration } from "@/lib/format";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { computeParentSyncSuggestion } from "@/lib/smartSync";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const INDENT = 22;
// Phones get a tighter indent — at 22px a third-level task had barely half the
// screen left for its own title.
const MOBILE_INDENT = 13;

const TaskTreeRow = ({ task, depth = 0, projectId, onOpenTask, isEditable = true }) => {
  const isPhone = useIsPhone();
  const [expanded, setExpanded] = useState(false);
  const [dismissedSync, setDismissedSync] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState("");
  const navigate = useNavigate();

  const hasChildren = (task.sub_tasks_count ?? 0) > 0;
  const { data: children, isLoading: childrenLoading } = useTaskChildren(task.id, expanded);

  const updateField = useUpdateTaskField();
  const deleteTaskMut = useDeleteTask();
  const setAssignees = useSetTaskAssignees();
  const createTask = useCreateTask();

  const suggestion = !dismissedSync ? computeParentSyncSuggestion(task, children) : null;

  const handleOpen = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return; // let the browser handle new-tab clicks
    e.preventDefault();
    onOpenTask(task.id);
  };

  const toggleQuickComplete = () => {
    const next = isCompletedStatus(task.task_status) ? "Backlog" : "Completed";
    updateField.mutate({ taskId: task.id, field: "status", value: next });
  };

  const submitChild = async (value) => {
    if (!value?.trim()) return;
    try {
      await createTask.mutateAsync({ projectId, parentTaskId: task.id, title: value.trim() });
      setNewChildTitle("");
      setAddingChild(false);
      setExpanded(true);
      toast.success("Sub-task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the sub-task.");
    }
  };

  const menuItems = [
    ...(isEditable ? [{ label: "Add sub-task", icon: "solar:add-circle-linear", onClick: () => { setAddingChild(true); setExpanded(true); } }] : []),
    { label: "Open task", icon: "solar:widget-3-linear", onClick: () => navigate(`/jobs/task/${task.id}`) },
    ...(isEditable ? ["divider", { label: "Delete task", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => deleteTaskMut.mutate(task.id) }] : []),
  ];

  /* ------------------------------------------------------------------ *
   * PHONE ROW
   *
   * The desktop row is one line: title, then priority, assignees, due date
   * and a fixed 104px status well. That trailing group is ~310px wide, so on
   * a 390px screen it left the title almost no room — it truncated to nothing
   * and the status pill still pushed past the card edge.
   *
   * Here the title gets the full width on its own line and the same controls
   * sit underneath it as a wrapping meta row. Chips that aren't set are left
   * out entirely rather than shown as empty "No date" / "Priority" outlines —
   * on a list of 200 rows that placeholder noise was most of the clutter. Set
   * them by opening the task, which is where the full meta row lives.
   *
   * The overflow menu is also always visible here: the desktop actions are
   * opacity-0 until :group-hover, and a touch screen has no hover, so on a
   * phone add-sub-task and delete were simply unreachable.
   * ------------------------------------------------------------------ */
  if (isPhone) {
    // priorityMeta returns null when nothing is set, which is the common case —
    // that's the chip worth omitting rather than rendering as an empty outline.
    const showPriority = Boolean(priorityMeta(task.priority));
    const assignees = (task.assignees || []).map((a) => a.user).filter(Boolean);

    return (
      <div>
        <div
          className="flex items-start gap-1.5 py-2 pr-1 rounded-lg active:bg-[var(--surface-sunken)] transition-colors duration-150"
          style={{ paddingLeft: depth * MOBILE_INDENT + 2 }}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className={cn(
              "w-7 h-7 flex-none grid place-items-center rounded-lg text-[var(--ink-tertiary)]",
              !hasChildren && "invisible"
            )}
          >
            <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <Icon icon="solar:alt-arrow-right-bold" className="text-[13px]" />
            </motion.span>
          </button>

          <button
            type="button"
            onClick={toggleQuickComplete}
            aria-label={isCompletedStatus(task.task_status) ? "Mark not done" : "Mark done"}
            className="w-7 h-7 flex-none grid place-items-center"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 grid place-items-center transition-colors duration-150",
                isCompletedStatus(task.task_status)
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-[var(--line-strong)]"
              )}
            >
              {isCompletedStatus(task.task_status) && <Icon icon="solar:check-read-linear" className="text-white text-[11px]" />}
            </span>
          </button>

          <div className="flex-1 min-w-0 pt-0.5">
            <a
              href={`/jobs/task/${task.id}`}
              onClick={handleOpen}
              className={cn(
                "block text-[14px] leading-snug font-medium text-[var(--ink-primary)] line-clamp-2",
                isCompletedStatus(task.task_status) && "line-through text-[var(--ink-tertiary)]"
              )}
            >
              {task.task_title}
            </a>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <StatusMenu
                status={task.task_status}
                onChange={(v) => updateField.mutate({ taskId: task.id, field: "status", value: v })}
                disabled={!isEditable}
              />
              {task.due_date && (
                <DueDatePill
                  date={task.due_date}
                  status={task.task_status}
                  onChange={(v) => updateField.mutate({ taskId: task.id, field: "dueDate", value: v })}
                  editable={isEditable}
                />
              )}
              {showPriority && (
                <PriorityMenu
                  priority={task.priority}
                  onChange={(v) => updateField.mutate({ taskId: task.id, field: "priority", value: v })}
                  disabled={!isEditable}
                />
              )}
              {assignees.length > 0 && (
                <AssigneePicker
                  assignees={assignees}
                  onChange={(ids, employees) => setAssignees.mutate({ taskId: task.id, employeeIds: ids, employees })}
                  disabled={!isEditable}
                />
              )}
              {hasChildren && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-2 py-1">
                  <Icon icon="solar:checklist-minimalistic-linear" className="text-[11px]" />
                  {task.sub_tasks_count}
                </span>
              )}
              {/* Customer/member only — see the desktop branch above for why
                  no role check is needed here. */}
              {typeof task.total_hours === "number" && task.total_hours > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 rounded-full px-2 py-1"
                  title="Time logged on this task"
                >
                  <Icon icon="solar:clock-circle-linear" className="text-[11px]" />
                  {task.total_hours_formatted || formatDuration(task.total_hours)}
                </span>
              )}
              {task.has_urgent_descendant && task.priority !== "Urgent" && (
                <Icon icon="solar:fire-bold" className="text-priority-urgent text-[13px]" title="Contains an urgent item" />
              )}
            </div>
          </div>

          <Menu
            trigger={<IconButton icon="solar:menu-dots-bold" size="sm" label="Task actions" className="flex-none" />}
            items={menuItems}
          />
        </div>

        <div style={{ paddingLeft: (depth + 1) * MOBILE_INDENT + 2 }}>
          <SmartSyncBanner
            suggestion={suggestion}
            isApplying={updateField.isPending}
            onAccept={() => updateField.mutate({ taskId: task.id, field: "status", value: "Completed" })}
            onDismiss={() => setDismissedSync(true)}
          />
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              {childrenLoading ? (
                <div className="py-1.5 space-y-1" style={{ paddingLeft: (depth + 1) * MOBILE_INDENT + 2 }}>
                  <div className="skeleton h-5 w-2/3 rounded" />
                </div>
              ) : (
                <TaskStatusGroups
                  tasks={children || []}
                  indent={(depth + 1) * MOBILE_INDENT + 2}
                  renderTask={(child) => (
                    <TaskTreeRow key={child.id} task={child} depth={depth + 1} projectId={projectId} onOpenTask={onOpenTask} isEditable={isEditable} />
                  )}
                />
              )}

              {addingChild && (
                <div className="py-1.5 pr-1" style={{ paddingLeft: (depth + 1) * MOBILE_INDENT + 2 }}>
                  <InlineAddField
                    value={newChildTitle}
                    onChange={setNewChildTitle}
                    onSubmit={submitChild}
                    onCancel={() => { setNewChildTitle(""); setAddingChild(false); }}
                    placeholder="Sub-task title"
                    busy={createTask.isPending}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-1.5 rounded-lg hover:bg-[var(--surface-sunken)] transition-colors pr-2"
        style={{ paddingLeft: depth * INDENT + 4 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn("w-5 h-5 flex-none flex items-center justify-center rounded-md text-[var(--ink-tertiary)]", !hasChildren && "invisible")}
        >
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <Icon icon="solar:alt-arrow-right-bold" className="text-[12px]" />
          </motion.span>
        </button>

        <button
          type="button"
          onClick={toggleQuickComplete}
          className={cn(
            "w-4.5 h-4.5 flex-none rounded-full border-2 flex items-center justify-center transition-colors",
            isCompletedStatus(task.task_status) ? "bg-emerald-500 border-emerald-500" : "border-[var(--line-strong)] hover:border-emerald-400"
          )}
          title="Quick toggle complete"
        >
          {isCompletedStatus(task.task_status) && <Icon icon="solar:check-read-linear" className="text-white text-[10px]" />}
        </button>

        <a
          href={`/jobs/task/${task.id}`}
          onClick={handleOpen}
          className={cn(
            "flex-1 min-w-0 truncate text-[13.5px] font-medium text-[var(--ink-primary)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors",
            isCompletedStatus(task.task_status) && "line-through text-[var(--ink-tertiary)]"
          )}
        >
          {task.task_title}
        </a>

        {task.has_urgent_descendant && task.priority !== "Urgent" && (
          <Icon icon="solar:fire-bold" className="text-priority-urgent text-[13px] flex-none" title="Contains an urgent item" />
        )}

        {hasChildren && (
          <span className="flex-none text-[10px] font-semibold text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-1.5 py-0.5">
            {task.sub_tasks_count}
          </span>
        )}

        {/* `total_hours` only ever arrives on a customer/member payload — staff
            endpoints never set it — so this is naturally invisible to admin,
            manager, supervisor, executive, employee and internee views without
            any role check here. Own-task time only (not rolled up into
            children), matching what "time logged on THIS row" should mean. */}
        {typeof task.total_hours === "number" && task.total_hours > 0 && (
          <span
            className="flex-none inline-flex items-center gap-1 text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 rounded-full px-1.5 py-0.5"
            title="Time logged on this task"
          >
            <Icon icon="solar:clock-circle-linear" className="text-[10px]" />
            {task.total_hours_formatted || formatDuration(task.total_hours)}
          </span>
        )}

        <div className="flex-none"><PriorityMenu priority={task.priority} onChange={(v) => updateField.mutate({ taskId: task.id, field: "priority", value: v })} disabled={!isEditable} /></div>
        <div className="flex-none"><AssigneePicker assignees={(task.assignees || []).map((a) => a.user).filter(Boolean)} onChange={(ids, employees) => setAssignees.mutate({ taskId: task.id, employeeIds: ids, employees })} disabled={!isEditable} /></div>
        <div className="flex-none"><DueDatePill date={task.due_date} status={task.task_status} onChange={(v) => updateField.mutate({ taskId: task.id, field: "dueDate", value: v })} editable={isEditable} /></div>
        <div className="flex-none w-[104px]"><StatusMenu status={task.task_status} onChange={(v) => updateField.mutate({ taskId: task.id, field: "status", value: v })} disabled={!isEditable} /></div>

        {isEditable && (
          <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <IconButton icon="solar:add-circle-linear" size="xs" label="Add sub-task" onClick={() => { setAddingChild(true); setExpanded(true); }} />
            <Menu
              trigger={<IconButton icon="solar:menu-dots-bold" size="xs" label="More" />}
              items={[
                { label: "Open task", icon: "solar:widget-3-linear", onClick: () => navigate(`/jobs/task/${task.id}`) },
                "divider",
                { label: "Delete task", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => deleteTaskMut.mutate(task.id) },
              ]}
            />
          </div>
        )}
      </div>

      <div style={{ paddingLeft: (depth + 1) * INDENT + 4 }}>
        <SmartSyncBanner
          suggestion={suggestion}
          isApplying={updateField.isPending}
          onAccept={() => updateField.mutate({ taskId: task.id, field: "status", value: "Completed" })}
          onDismiss={() => setDismissedSync(true)}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {childrenLoading ? (
              <div className="py-1.5 space-y-1" style={{ paddingLeft: (depth + 1) * INDENT + 4 }}>
                <div className="skeleton h-5 w-2/3 rounded" />
              </div>
            ) : (
              <TaskStatusGroups
                tasks={children || []}
                indent={(depth + 1) * INDENT + 4}
                renderTask={(child) => (
                  <TaskTreeRow key={child.id} task={child} depth={depth + 1} projectId={projectId} onOpenTask={onOpenTask} isEditable={isEditable} />
                )}
              />
            )}

            {addingChild && (
              <div className="py-1.5 pr-1" style={{ paddingLeft: (depth + 1) * INDENT + 4 }}>
                <InlineAddField
                  value={newChildTitle}
                  onChange={setNewChildTitle}
                  onSubmit={submitChild}
                  onCancel={() => { setNewChildTitle(""); setAddingChild(false); }}
                  placeholder="Sub-task title"
                  busy={createTask.isPending}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskTreeRow;
