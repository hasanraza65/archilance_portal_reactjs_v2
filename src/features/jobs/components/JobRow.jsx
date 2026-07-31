import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";

import { StatusPill } from "@/components/ui/StatusPill";
import { useJobRootTasks, useCreateTask } from "../useJobsData";
import TaskTreeRow from "./TaskTreeRow";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const JobRow = ({ job, onOpenTask, isEditable = true }) => {
  const [expanded, setExpanded] = useState(false);
  const [addingRoot, setAddingRoot] = useState(false);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useJobRootTasks(job.id, expanded);
  const createTask = useCreateTask();

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({ projectId: job.id, title: title.trim() });
      setTitle("");
      setAddingRoot(false);
      toast.success("Task added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add the task.");
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="group flex items-center gap-3 px-3.5 py-3 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="text-[var(--ink-tertiary)] flex-none">
          <Icon icon="solar:alt-arrow-right-bold" className="text-[13px]" />
        </motion.span>

        <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-none">
          <Icon icon="solar:folder-bold-duotone" className="text-[17px]" />
        </span>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
          className="font-semibold text-[14.5px] text-[var(--ink-primary)] hover:text-primary-600 dark:hover:text-primary-400 truncate"
        >
          {job.project_name}
        </button>

        {job.has_urgent && <Icon icon="solar:fire-bold" className="text-priority-urgent text-[14px] flex-none" />}
        {job.customer?.name && (
          <span className="hidden sm:inline text-xs text-[var(--ink-tertiary)] truncate">· {job.customer.name}</span>
        )}

        <span className="ml-auto flex items-center gap-2.5 flex-none">
          {typeof job.tasks_count === "number" && (
            <span className="text-[11px] text-[var(--ink-tertiary)] hidden sm:inline">{job.tasks_count} tasks</span>
          )}
          {job.due_date && <span className="text-[11px] text-[var(--ink-tertiary)] hidden md:inline">Due {formatDate(job.due_date)}</span>}
          <StatusPill status={job.status} />
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[var(--line-subtle)]"
          >
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton h-5 w-3/4 rounded" />)}
                </div>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskTreeRow key={task.id} task={task} depth={0} projectId={job.id} onOpenTask={onOpenTask} isEditable={isEditable} />
                ))
              ) : (
                <p className="text-xs text-[var(--ink-tertiary)] py-3 px-2">No tasks yet in this job.</p>
              )}

              {isEditable && (
                addingRoot ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingRoot(true)}
                    className={cn("flex items-center gap-2 px-2 py-1.5 text-[13px] text-[var(--ink-tertiary)] hover:text-primary-500 rounded-lg w-full")}
                  >
                    <Icon icon="solar:add-circle-linear" className="text-[15px]" />
                    Add task
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobRow;
