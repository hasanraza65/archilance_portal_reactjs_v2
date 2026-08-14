import React from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

/**
 * Guard on the one job status that does more than it says.
 *
 * ProjectController::updateStatus flips EVERY task in the job to Completed when
 * the job itself is completed, and notifies the people assigned to them. There
 * is no undo, and the trigger is a pill in a list hundreds of rows long — so
 * this is the one option that asks first. Every other status applies instantly.
 */
const CompleteJobConfirm = ({ open, job, onConfirm, onCancel, isPending = false }) => {
  const taskCount = typeof job?.tasks_count === "number" ? job.tasks_count : null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Complete this job?"
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button onClick={onConfirm} isLoading={isPending}>Complete job</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="w-9 h-9 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 grid place-items-center flex-none">
          <Icon icon="solar:danger-triangle-bold" className="text-[17px]" />
        </span>
        <div className="text-sm text-[var(--ink-secondary)] space-y-2">
          <p>
            <span className="font-semibold text-[var(--ink-primary)]">{job?.project_name}</span> will be marked
            Completed.
          </p>
          <p>
            This also marks{" "}
            <span className="font-semibold text-[var(--ink-primary)]">
              {taskCount === null ? "every task in this job" : `all ${taskCount} task${taskCount === 1 ? "" : "s"} in it`}
            </span>{" "}
            as Completed and notifies whoever is assigned to them. It can't be undone in one step.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default CompleteJobConfirm;
