import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import FilePicker from "@/components/ui/FilePicker";
import AttachmentList from "@/components/ui/AttachmentList";
import { useTaskAttachments } from "@/features/jobs/useJobsData";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

/**
 * Files attached to a task.
 *
 * There's no dedicated attachment endpoint — adds and removes both ride on the
 * task update, so each action is one multipart PUT. `taskTitle` is passed
 * through because the task validator marks the title `sometimes|required`.
 */
const TaskAttachments = ({ task, editable = true }) => {
  const attachments = task?.attachments || [];
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  const mutate = useTaskAttachments();

  const upload = async () => {
    if (pending.length === 0) return;
    try {
      await mutate.mutateAsync({ taskId: task.id, files: pending, taskTitle: task.task_title });
      toast.success(`${pending.length} file${pending.length === 1 ? "" : "s"} attached.`);
      setPending([]);
      setAddOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't upload those files."));
    }
  };

  const remove = async (id) => {
    setRemovingId(id);
    try {
      await mutate.mutateAsync({ taskId: task.id, deleteIds: [id], taskTitle: task.task_title });
      toast.success("Attachment removed.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't remove that attachment."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
          <Icon icon="solar:paperclip-linear" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Attachments</span>
        <span className="text-[11px] text-[var(--ink-tertiary)]">{attachments.length}</span>
        {editable && (
          <Button size="xs" variant="secondary" icon="solar:add-circle-linear" onClick={() => setAddOpen(true)}>
            Add
          </Button>
        )}
      </div>

      <div className="p-3">
        <AttachmentList
          attachments={attachments}
          onRemove={editable ? remove : undefined}
          removingId={removingId}
          emptyText={editable ? "No files yet — drop drawings, PDFs or references here." : "No files."}
          compact
        />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Attach files" className="max-w-lg">
        <div className="space-y-4">
          <FilePicker files={pending} onChange={setPending} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setPending([]); setAddOpen(false); }}>Cancel</Button>
            <Button
              onClick={upload}
              isLoading={mutate.isPending}
              disabled={pending.length === 0}
              icon="solar:inbox-in-linear"
            >
              Upload {pending.length > 0 ? `${pending.length} file${pending.length === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskAttachments;
