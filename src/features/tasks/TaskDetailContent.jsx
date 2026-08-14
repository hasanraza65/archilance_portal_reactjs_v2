import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Menu from "@/components/ui/Menu";
import DueDatePill from "@/components/ui/DueDatePill";
import SmartSyncBanner from "@/components/ui/SmartSyncBanner";
import { SkeletonText } from "@/components/ui/Skeleton";
import InlineAddField from "@/components/ui/InlineAddField";
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
import { useIsPhone } from "@/hooks/useMediaQuery";
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

  // Phones get a tabbed layout instead of one long scroll (see the note above
  // the header). Matched to Tailwind's `sm` so it lines up with the classes here.
  const isPhone = useIsPhone();
  const [mobileTab, setMobileTab] = useState("details");

  useEffect(() => {
    if (task) {
      setTitleDraft(task.task_title || "");
      setDescription(task.task_description || "");
      setDismissedSync(false);
      // Opening a different task should start at the top of it, not on
      // whichever tab the last one was left on.
      setMobileTab("details");
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

  const submitSubtask = async (value) => {
    if (!value?.trim()) return;
    try {
      await createTask.mutateAsync({ projectId: task.project_id, parentTaskId: task.id, title: value.trim() });
      setSubtaskTitle("");
      setAddingSubtask(false);
      toast.success("Sub-task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the sub-task.");
    }
  };

  const subtasks = task.sub_tasks || [];
  const suggestion = !dismissedSync ? computeParentSyncSuggestion(task, subtasks) : null;

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/jobs/task/${task.id}`);
    toast.success("Link copied");
  };
  const overflowItems = [
    ...(showOpenFull ? [{ label: "Open full page", icon: "solar:square-top-down-linear", onClick: () => navigate(`/jobs/task/${task.id}`) }] : []),
    { label: "Copy link", icon: "solar:link-linear", onClick: copyLink },
    { label: "Delete task", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => { deleteTaskMut.mutate(taskId); onClose?.(); } },
  ];

  /* ------------------------------------------------------------------ *
   * PHONE LAYOUT
   *
   * Everything below is one long scroll: title, four meta pills, a rich
   * text editor, subtasks, checklist, files, briefs, time log and two
   * comment threads. On a desktop column that reads fine; on a 390px
   * screen it's a wall you have to scroll past to reach anything.
   *
   * So on phones only, the same sections are split behind a tab bar and
   * the header becomes a proper app bar — one back affordance, one
   * overflow menu — the way a native app would do it. The desktop branch
   * further down is untouched.
   * ------------------------------------------------------------------ */
  const fileCount = (task.attachments?.length || 0) + (task.all_briefs || task.allBriefs || []).length;
  const doneSubtasks = subtasks.filter((s) => s.task_status?.toLowerCase() === "completed").length;
  const MOBILE_TABS = [
    { key: "details", label: "Details", icon: "solar:document-text-linear" },
    { key: "subtasks", label: "Subtasks", icon: "solar:checklist-minimalistic-linear", count: subtasks.length },
    { key: "files", label: "Files", icon: "solar:paperclip-linear", count: fileCount },
    { key: "comments", label: "Comments", icon: "solar:chat-round-dots-linear" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header — app bar on phones, the original toolbar from sm: up */}
      <div className="flex items-center gap-1 px-1.5 sm:px-5 h-14 flex-none border-b border-[var(--line-subtle)]">
        {isPhone ? (
          <>
            <IconButton
              icon="solar:alt-arrow-left-linear"
              size="md"
              label="Back"
              onClick={() => (onClose ? onClose() : navigate(-1))}
            />
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[13px] font-semibold text-[var(--ink-primary)] truncate px-1">
                {task.parent_task ? task.parent_task.task_title : `Task #${task.id}`}
              </p>
            </div>
            <Menu
              trigger={<IconButton icon="solar:menu-dots-bold" size="md" label="More" />}
              items={overflowItems}
            />
          </>
        ) : (
          <>
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
              <IconButton icon="solar:link-linear" size="sm" label="Copy link" onClick={copyLink} />
              <Menu
                trigger={<IconButton icon="solar:menu-dots-bold" size="sm" label="More" />}
                items={[{ label: "Delete task", icon: "solar:trash-bin-trash-linear", danger: true, onClick: () => { deleteTaskMut.mutate(taskId); onClose?.(); } }]}
              />
              {onClose && <IconButton icon="solar:close-circle-bold" size="sm" label="Close" onClick={onClose} />}
            </div>
          </>
        )}
      </div>

      {isPhone && (
        <>
          {/* Title + meta stay pinned above the tabs: they identify the screen,
              so they shouldn't disappear when you switch to Comments. */}
          <div className="flex-none px-4 pt-3 pb-2 border-b border-[var(--line-subtle)]">
            {editingTitle ? (
              <textarea
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle(); } }}
                rows={2}
                className="w-full text-[17px] font-bold bg-transparent outline-none resize-none border-b-2 border-primary-400 pb-1 text-[var(--ink-primary)]"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-[17px] leading-snug font-bold text-[var(--ink-primary)] line-clamp-2 cursor-text"
              >
                {task.task_title}
              </h1>
            )}

            {/* One scrolling row, not a wrapping block — four pills wrapping to
                three lines was most of the crowding. Bleeds to the edge so it
                reads as swipeable. */}
            <div className="flex items-center gap-2 mt-2.5 -mx-4 px-4 overflow-x-auto no-scrollbar">
              <StatusMenu status={task.task_status} onChange={(v) => updateField.mutate({ taskId, field: "status", value: v })} size="md" />
              <PriorityMenu priority={task.priority} onChange={(v) => updateField.mutate({ taskId, field: "priority", value: v })} size="md" showLabel />
              <DueDatePill date={task.due_date} status={task.task_status} onChange={(v) => updateField.mutate({ taskId, field: "dueDate", value: v })} size="md" />
              <AssigneePicker
                assignees={(task.assignees || []).map((a) => a.user).filter(Boolean)}
                onChange={(ids, employees) => setAssignees.mutate({ taskId, employeeIds: ids, employees })}
                size="md"
              />
            </div>
          </div>

          <div className="flex-none flex gap-1 px-2 border-b border-[var(--line-subtle)] overflow-x-auto no-scrollbar">
            {MOBILE_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setMobileTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px flex-none whitespace-nowrap",
                  "transition-colors duration-150 ease-out",
                  mobileTab === t.key
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-[var(--ink-secondary)]"
                )}
              >
                <Icon icon={t.icon} className="text-[14px]" />
                {t.label}
                {t.count > 0 && (
                  <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]">
                    {t.key === "subtasks" ? `${doneSubtasks}/${t.count}` : t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {mobileTab === "details" && (
              <div className="space-y-5">
                <div>
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
                <NotesPanel
                  parentId={task.id}
                  type="task"
                  notes={task.all_notes || task.allNotes || []}
                  editable={isEditable}
                  invalidateKeys={[["task-detail"]]}
                />
                {seesInternal && <TaskTimeLog task={task} />}
              </div>
            )}

            {mobileTab === "subtasks" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                    Subtasks {subtasks.length > 0 && `(${doneSubtasks}/${subtasks.length})`}
                  </p>
                  <button onClick={() => setAddingSubtask(true)} className="text-[13px] font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1">
                    <Icon icon="solar:add-circle-linear" className="text-[14px]" /> Add
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
                    <p className="text-[13px] text-[var(--ink-tertiary)] px-3 py-4">No subtasks yet.</p>
                  )}
                  {subtasks.map((st) => (
                    <div key={st.id} className="px-1">
                      <TaskTreeRow task={st} depth={0} projectId={task.project_id} onOpenTask={(id) => navigate(`/jobs/task/${id}`)} />
                    </div>
                  ))}
                  {addingSubtask && (
                    <div className="p-2">
                      <InlineAddField
                        value={subtaskTitle}
                        onChange={setSubtaskTitle}
                        onSubmit={submitSubtask}
                        onCancel={() => { setSubtaskTitle(""); setAddingSubtask(false); }}
                        placeholder="Subtask title"
                        busy={createTask.isPending}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {mobileTab === "files" && (
              <div className="space-y-3">
                <TaskAttachments task={task} editable={isEditable} />
                <BriefsSection
                  scope="task"
                  parentId={task.id}
                  briefs={task.all_briefs || task.allBriefs || []}
                  editable={isEditable}
                  invalidateKeys={[["task-detail"]]}
                />
              </div>
            )}

            {mobileTab === "comments" && (
              <div>
                <div className="flex gap-1 border-b border-[var(--line-subtle)] mb-2">
                  {commentTabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setCommentTab(t.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 ease-out",
                        commentTab === t.key
                          ? "border-primary-500 text-primary-600 dark:text-primary-400"
                          : "border-transparent text-[var(--ink-secondary)]"
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
                <CommentsPanel key={commentTab} taskId={taskId} scope={commentTab} />
              </div>
            )}
          </div>
        </>
      )}

      {!isPhone && (
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
              <div className="p-2">
                <InlineAddField
                  value={subtaskTitle}
                  onChange={setSubtaskTitle}
                  onSubmit={submitSubtask}
                  onCancel={() => { setSubtaskTitle(""); setAddingSubtask(false); }}
                  placeholder="Subtask title"
                  busy={createTask.isPending}
                />
              </div>
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
      )}
    </div>
  );
};

export default TaskDetailContent;
