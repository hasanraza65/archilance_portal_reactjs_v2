import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Menu from "@/components/ui/Menu";
import DueDatePill from "@/components/ui/DueDatePill";
import SmartSyncBanner from "@/components/ui/SmartSyncBanner";
import { SkeletonText } from "@/components/ui/Skeleton";
import StatusMenu from "@/features/jobs/components/StatusMenu";
import PriorityMenu from "@/features/jobs/components/PriorityMenu";
import AssigneePicker from "@/features/jobs/components/AssigneePicker";
import TaskTreeRow from "@/features/jobs/components/TaskTreeRow";
import TaskAttachments from "./components/TaskAttachments";
import BriefsSection from "@/features/briefs/BriefsSection";
import CommentsPanel from "./components/CommentsPanel";
import TaskTimeLog from "./components/TaskTimeLog";
import NotesPanel from "@/features/notes/NotesPanel";
import { useAuth } from "@/auth/AuthContext";
import { useTaskDetail } from "./useTaskDetail";
import { useUpdateTaskField, useDeleteTask, useSetTaskAssignees, useCreateTask } from "@/features/jobs/useJobsData";
import { computeParentSyncSuggestion } from "@/lib/smartSync";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

/**
 * Shared task-detail body, used inside both the slide-over Sheet and the
 * full-page route so behavior is identical everywhere it's opened from.
 */
const TaskDetailContent = ({ taskId, onClose, showOpenFull = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Same set that can edit a task elsewhere in the app — customers and their
  // team members read tasks, they don't attach files or write briefs.
  const isEditable = ["admin", "manager", "supervisor", "executive", "employee", "outsource", "internee"].includes(user?.role);
  const { data: task, isLoading } = useTaskDetail(taskId);
  const updateField = useUpdateTaskField();
  const deleteTaskMut = useDeleteTask();
  const setAssignees = useSetTaskAssignees();
  const createTask = useCreateTask();

  // Customers and their team members only ever get the client-facing thread —
  // the internal one is staff-only, and its endpoint filters server-side too.
  const seesInternal = !["customer", "member"].includes(user?.role);
  const commentTabs = [
    ...(seesInternal
      ? [{ key: "internal", label: "Internal", icon: "solar:users-group-rounded-linear" }]
      : []),
    { key: "client", label: "Client", icon: "solar:buildings-2-linear" },
  ];
  const [commentTab, setCommentTab] = useState(seesInternal ? "internal" : "client");

  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [dismissedSync, setDismissedSync] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const descSaveTimer = useRef(null);

  useEffect(() => {
    if (task) {
      setTitleDraft(task.task_title || "");
      setDescription(task.task_description || "");
      setDismissedSync(false);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !task) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-7 w-2/3 rounded" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-7 w-20 rounded-full" />)}
        </div>
        <SkeletonText lines={4} />
      </div>
    );
  }

  const saveTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== task.task_title) {
      updateField.mutate({ taskId, field: "title", value: titleDraft.trim() });
    }
  };

  const handleDescriptionChange = (val) => {
    setDescription(val);
    clearTimeout(descSaveTimer.current);
    descSaveTimer.current = setTimeout(() => {
      updateField.mutate({ taskId, field: "description", value: val });
    }, 900);
  };

  const submitSubtask = async (e) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    try {
      await createTask.mutateAsync({ projectId: task.project_id, parentTaskId: task.id, title: subtaskTitle.trim() });
      setSubtaskTitle("");
      setAddingSubtask(false);
      toast.success("Sub-task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the sub-task.");
    }
  };

  const subtasks = task.sub_tasks || [];
  const suggestion = !dismissedSync ? computeParentSyncSuggestion(task, subtasks) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-4 sm:px-5 h-14 flex-none border-b border-[var(--line-subtle)]">
        {task.parent_task && (
          <button
            onClick={() => navigate(`/jobs/task/${task.parent_task.id}`)}
            className="text-xs text-[var(--ink-tertiary)] hover:text-primary-500 truncate max-w-[160px]"
          >
            {task.parent_task.task_title}
          </button>
        )}
        {task.parent_task && <Icon icon="solar:alt-arrow-right-linear" className="text-[var(--ink-tertiary)] text-[12px]" />}
        <span className="text-xs text-[var(--ink-tertiary)]">Task #{task.id}</span>

        <div className="ml-auto flex items-center gap-1">
          {showOpenFull && (
            <IconButton icon="solar:square-top-down-linear" size="sm" label="Open full page" onClick={() => navigate(`/jobs/task/${task.id}`)} />
          )}
          <IconButton
            icon="solar:link-linear"
            size="sm"
            label="Copy link"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/jobs/task/${task.id}`);
              toast.success("Link copied");
            }}
          />
          <Menu
            trigger={<IconButton icon="solar:menu-dots-bold" size="sm" label="More" />}
            items={[{ label: "Delete task", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => { deleteTaskMut.mutate(taskId); onClose?.(); } }]}
          />
          {onClose && <IconButton icon="solar:close-circle-bold" size="sm" label="Close" onClick={onClose} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
        {/* Title */}
        {editingTitle ? (
          <textarea
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle(); } }}
            rows={1}
            className="w-full text-xl font-bold bg-transparent outline-none resize-none border-b-2 border-primary-400 pb-1"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-xl font-bold text-[var(--ink-primary)] cursor-text hover:bg-[var(--surface-sunken)] rounded-lg -mx-1.5 px-1.5 py-0.5"
          >
            {task.task_title}
          </h1>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          <StatusMenu status={task.task_status} onChange={(v) => updateField.mutate({ taskId, field: "status", value: v })} size="md" />
          <PriorityMenu priority={task.priority} onChange={(v) => updateField.mutate({ taskId, field: "priority", value: v })} size="md" showLabel />
          <DueDatePill date={task.due_date} status={task.task_status} onChange={(v) => updateField.mutate({ taskId, field: "dueDate", value: v })} size="md" />
          <AssigneePicker
            assignees={(task.assignees || []).map((a) => a.user).filter(Boolean)}
            onChange={(ids, employees) => setAssignees.mutate({ taskId, employeeIds: ids, employees })}
            size="md"
          />
        </div>

        {/* Description */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mb-1.5">Description</p>
          <div className="contract-quill">
            <ReactQuill
              theme="snow"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add a description…"
              modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link", "clean"]] }}
            />
          </div>
        </div>

        {/* Subtasks */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
              Subtasks {subtasks.length > 0 && `(${subtasks.filter((s) => s.task_status?.toLowerCase() === "completed").length}/${subtasks.length})`}
            </p>
            <button onClick={() => setAddingSubtask(true)} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              <Icon icon="solar:add-circle-linear" className="text-[13px]" /> Add
            </button>
          </div>

          <SmartSyncBanner
            suggestion={suggestion}
            isApplying={updateField.isPending}
            onAccept={() => updateField.mutate({ taskId, field: "status", value: "Completed" })}
            onDismiss={() => setDismissedSync(true)}
          />

          <div className="rounded-xl border border-[var(--line-subtle)] mt-2 divide-y divide-[var(--line-subtle)] overflow-hidden">
            {subtasks.length === 0 && !addingSubtask && (
              <p className="text-xs text-[var(--ink-tertiary)] px-3 py-3">No subtasks yet.</p>
            )}
            {subtasks.map((st) => (
              <div key={st.id} className="px-1">
                <TaskTreeRow task={st} depth={0} projectId={task.project_id} onOpenTask={(id) => navigate(`/jobs/task/${id}`)} />
              </div>
            ))}
            {addingSubtask && (
              <form onSubmit={submitSubtask} className="flex items-center gap-2 px-3 py-2.5">
                <Icon icon="solar:add-circle-linear" className="text-[var(--ink-tertiary)] text-[15px]" />
                <input
                  autoFocus
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  onBlur={() => !subtaskTitle && setAddingSubtask(false)}
                  placeholder="Subtask title, press Enter"
                  className="flex-1 text-sm bg-transparent outline-none"
                />
              </form>
            )}
          </div>
        </div>

        {/* Checklist, attachments, briefs, time */}
        <div className="mt-6 grid grid-cols-1 gap-3">
          <NotesPanel
            parentId={task.id}
            type="task"
            notes={task.all_notes || task.allNotes || []}
            editable={isEditable}
            invalidateKeys={[["task-detail"]]}
          />
          <TaskAttachments task={task} editable={isEditable} />
          <BriefsSection
            scope="task"
            parentId={task.id}
            briefs={task.all_briefs || task.allBriefs || []}
            editable={isEditable}
            invalidateKeys={[["task-detail"]]}
          />
          {seesInternal && <TaskTimeLog task={task} />}
        </div>

        {/* Comments — two independent threads (see COMMENT_SCOPES in api/comments.js) */}
        <div className="mt-6 pb-2">
          <div className="flex gap-1 border-b border-[var(--line-subtle)] mb-2">
            {commentTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setCommentTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                  commentTab === t.key
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                )}
              >
                <Icon icon={t.icon} className="text-[14px]" />
                {t.label}
              </button>
            ))}
          </div>

          {commentTab === "client" && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 mb-2">
              <Icon icon="solar:danger-triangle-bold" className="text-[12px] mt-0.5 flex-none" />
              Everything in this thread is visible to the customer.
            </p>
          )}

          {/* Keyed so switching tabs mounts a fresh thread rather than briefly
              showing the previous one's messages under the new heading. */}
          <CommentsPanel key={commentTab} taskId={taskId} scope={commentTab} />
        </div>
      </div>
    </div>
  );
};

export default TaskDetailContent;
