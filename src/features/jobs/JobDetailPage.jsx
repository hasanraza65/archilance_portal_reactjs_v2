import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import { useJobDetail, useJobRootTasks, useCreateTask } from "./useJobsData";
import TaskTreeRow from "./components/TaskTreeRow";
import JobHeader from "./components/JobHeader";
import ProjectChatPanel from "./components/ProjectChatPanel";
import TaskDetailSheet from "@/features/tasks/TaskDetailSheet";
import BriefsSection from "@/features/briefs/BriefsSection";
import NotesPanel from "@/features/notes/NotesPanel";
import JobHoursSummary from "./components/JobHoursSummary";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "tasks", label: "Tasks", icon: "solar:checklist-minimalistic-linear" },
  { key: "briefs", label: "Briefs", icon: "solar:file-check-bold-duotone" },
  { key: "chat", label: "Chat", icon: "solar:chat-round-dots-linear" },
];

const JobDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Scoping the hours summary re-fetches the job with summary_start/end_date —
  // it's computed server-side, so there is nothing to filter client-side.
  const [hoursRange, setHoursRange] = useState({ start: null, end: null });

  const { data: job, isLoading, isFetching } = useJobDetail(projectId, hoursRange);
  const { data: tasks, isLoading: tasksLoading } = useJobRootTasks(projectId);
  const createTask = useCreateTask();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addingRoot, setAddingRoot] = useState(false);
  const [title, setTitle] = useState("");
  const [tab, setTab] = useState("tasks");

  // Everyone gets a chat tab; staff additionally get the internal thread.
  // Customers/members only ever see the shared "Client" conversation.
  const canChat = true;
  const seesInternal = !["customer", "member"].includes(user?.role);
  const chatScopes = [
    ...(seesInternal ? [{ key: "internal", label: "Internal", icon: "solar:users-group-rounded-linear" }] : []),
    { key: "client", label: "Client", icon: "solar:buildings-2-linear" },
  ];
  const [chatScope, setChatScope] = useState(seesInternal ? "internal" : "client");

  const openTaskId = searchParams.get("task");
  const setOpenTaskId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("task", id);
    else next.delete("task");
    setSearchParams(next, { replace: true });
  };

  const isEditable = ["admin", "manager", "supervisor", "executive", "employee", "outsource", "internee"].includes(user?.role);

  // Briefs ship with the job detail (`allBriefs`), so there's nothing extra to fetch.
  const briefs = job?.all_briefs || job?.allBriefs || [];

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({ projectId, title: title.trim() });
      setTitle("");
      setAddingRoot(false);
      toast.success("Task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the task.");
    }
  };

  if (isLoading) {
    return <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>;
  }
  if (!job) return <EmptyState icon="solar:folder-error-linear" title="Job not found" />;

  return (
    <div className="pb-10">
      <div className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-7">
        <button onClick={() => navigate("/jobs")} className="flex items-center gap-1.5 text-xs text-[var(--ink-tertiary)] hover:text-primary-500 mb-3">
          <Icon icon="solar:alt-arrow-left-linear" /> All jobs
        </button>
        <JobHeader job={job} isEditable={isEditable} />

        <div className="flex gap-1 mt-4 border-b border-[var(--line-subtle)] -mb-px overflow-x-auto">
          {TABS.filter((t) => t.key !== "chat" || canChat).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex-none",
                tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-[var(--ink-secondary)]"
              )}
            >
              <Icon icon={t.icon} className="text-[15px]" /> {t.label}
              {t.key === "briefs" && briefs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]">
                  {briefs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-6">
        {tab === "chat" && canChat ? (
          <div className="max-w-3xl">
            {chatScopes.length > 1 && (
              <div className="flex gap-1 border-b border-[var(--line-subtle)] mb-3">
                {chatScopes.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setChatScope(c.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                      chatScope === c.key
                        ? "border-primary-500 text-primary-600 dark:text-primary-400"
                        : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    )}
                  >
                    <Icon icon={c.icon} className="text-[14px]" />
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {chatScope === "client" && seesInternal && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 mb-2">
                <Icon icon="solar:danger-triangle-bold" className="text-[12px] mt-0.5 flex-none" />
                Everything in this thread is visible to the customer.
              </p>
            )}
            <ProjectChatPanel key={chatScope} projectId={projectId} scope={chatScope} />
          </div>
        ) : tab === "briefs" ? (
          <div className="max-w-3xl">
            <BriefsSection
              scope="project"
              parentId={projectId}
              briefs={briefs}
              editable={isEditable}
              invalidateKeys={[["job-detail"]]}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[var(--ink-primary)]">Tasks</p>
              {isEditable && (
                <button onClick={() => setAddingRoot(true)} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                  <Icon icon="solar:add-circle-linear" className="text-[13px]" /> Add task
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-2">
              {tasksLoading ? (
                <div className="space-y-2 p-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-5 w-3/4 rounded" />)}</div>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskTreeRow key={task.id} task={task} depth={0} projectId={projectId} onOpenTask={setOpenTaskId} isEditable={isEditable} />
                ))
              ) : (
                <p className="text-xs text-[var(--ink-tertiary)] py-3 px-2">No tasks yet.</p>
              )}

              {addingRoot && (
                <form onSubmit={submit} className="flex items-center gap-2 py-1.5 px-2">
                  <Icon icon="solar:add-circle-linear" className="text-[var(--ink-tertiary)] text-[15px]" />
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => !title && setAddingRoot(false)}
                    placeholder="Task title, press Enter to save"
                    className="flex-1 text-[13.5px] bg-transparent outline-none border-b border-primary-300 pb-0.5"
                  />
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              <NotesPanel
                parentId={projectId}
                type="project"
                notes={job.all_notes || job.allNotes || []}
                editable={isEditable}
                invalidateKeys={[["job-detail"]]}
              />
              {seesInternal && (
                <JobHoursSummary
                  summary={job.tasks_hours_summary || []}
                  range={hoursRange}
                  onRangeChange={setHoursRange}
                  isFetching={isFetching}
                />
              )}
            </div>
          </>
        )}
      </div>

      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
};

export default JobDetailPage;
