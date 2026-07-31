import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import Menu from "@/components/ui/Menu";
import IconButton from "@/components/ui/IconButton";
import DueDatePill from "@/components/ui/DueDatePill";
import SmartSyncBanner from "@/components/ui/SmartSyncBanner";
import StatusMenu from "./StatusMenu";
import PriorityMenu from "./PriorityMenu";
import AssigneePicker from "./AssigneePicker";
import { useTaskChildren, useUpdateTaskField, useDeleteTask, useSetTaskAssignees, useCreateTask } from "../useJobsData";
import { isCompletedStatus } from "@/lib/statusMeta";
import { computeParentSyncSuggestion } from "@/lib/smartSync";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const INDENT = 22;

const TaskTreeRow = ({ task, depth = 0, projectId, onOpenTask, isEditable = true }) => {
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

  const submitChild = async (e) => {
    e.preventDefault();
    if (!newChildTitle.trim()) return;
    try {
      await createTask.mutateAsync({ projectId, parentTaskId: task.id, title: newChildTitle.trim() });
      setNewChildTitle("");
      setAddingChild(false);
      setExpanded(true);
      toast.success("Sub-task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the sub-task.");
    }
  };

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
              (children || []).map((child) => (
                <TaskTreeRow key={child.id} task={child} depth={depth + 1} projectId={projectId} onOpenTask={onOpenTask} isEditable={isEditable} />
              ))
            )}

            {addingChild && (
              <form onSubmit={submitChild} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: (depth + 1) * INDENT + 4 }}>
                <Icon icon="solar:add-circle-linear" className="text-[var(--ink-tertiary)] text-[15px]" />
                <input
                  autoFocus
                  value={newChildTitle}
                  onChange={(e) => setNewChildTitle(e.target.value)}
                  onBlur={() => !newChildTitle && setAddingChild(false)}
                  placeholder="Sub-task title, press Enter to save"
                  className="flex-1 text-[13.5px] bg-transparent outline-none border-b border-primary-300 pb-0.5"
                />
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskTreeRow;
