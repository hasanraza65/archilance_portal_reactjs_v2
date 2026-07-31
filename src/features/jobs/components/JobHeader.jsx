import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import Icon from "@/components/ui/Icon";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import RichText from "@/components/ui/RichText";
import DueDatePill from "@/components/ui/DueDatePill";
import { StatusPill } from "@/components/ui/StatusPill";
import StatusMenu from "./StatusMenu";
import { useUpdateJob, useUpdateJobStatus, useDeleteJob } from "../useJobsData";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import { cn } from "@/lib/cn";

const DESC_MODULES = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

/** Job title / description / due date / status — all editable inline. */
const JobHeader = ({ job, isEditable }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateJob = useUpdateJob();
  const updateStatus = useUpdateJobStatus();
  const deleteJob = useDeleteJob();

  // Deleting a whole job takes everything under it out of view, so it's kept to
  // the roles that can create one in the first place.
  const canDelete = ["admin", "manager", "supervisor", "executive"].includes(user?.role);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteJob.mutateAsync(job.id);
      toast.success(`"${job.project_name}" deleted.`);
      navigate("/jobs");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't delete the job."));
    }
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(job.project_name || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(job.project_description || "");

  useEffect(() => {
    setTitle(job.project_name || "");
    setDesc(job.project_description || "");
  }, [job.id, job.project_name, job.project_description]);

  const saveTitle = async () => {
    setEditingTitle(false);
    const next = title.trim();
    if (!next || next === job.project_name) {
      setTitle(job.project_name || "");
      return;
    }
    try {
      await updateJob.mutateAsync({ projectId: job.id, projectName: next });
      toast.success("Job renamed.");
    } catch (err) {
      setTitle(job.project_name || "");
      toast.error(extractErrorMessage(err, "Couldn't rename the job."));
    }
  };

  const saveDesc = async () => {
    // Quill leaves "<p><br></p>" behind for an empty editor — treat that as blank.
    const plain = desc.replace(/<[^>]*>/g, "").trim();
    const next = plain ? desc : "";
    setEditingDesc(false);
    if (next === (job.project_description || "")) return;
    try {
      await updateJob.mutateAsync({ projectId: job.id, projectDescription: next });
      toast.success("Description updated.");
    } catch (err) {
      setDesc(job.project_description || "");
      toast.error(extractErrorMessage(err, "Couldn't update the description."));
    }
  };

  const saveDueDate = async (value) => {
    try {
      await updateJob.mutateAsync({ projectId: job.id, dueDate: value });
      toast.success(value ? "Due date updated." : "Due date cleared.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't update the due date."));
    }
  };

  const saveStatus = async (status) => {
    try {
      await updateStatus.mutateAsync({ projectId: job.id, status });
      toast.success(
        status === "Completed"
          ? "Job completed — its tasks were marked Completed too."
          : `Status changed to ${status}.`
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't change the status."));
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setTitle(job.project_name || ""); setEditingTitle(false); }
            }}
            className="w-full max-w-2xl text-xl lg:text-2xl font-bold bg-transparent outline-none border-b-2 border-primary-400 pb-0.5"
          />
        ) : (
          <h1
            onClick={() => isEditable && setEditingTitle(true)}
            className={cn(
              "text-xl lg:text-2xl font-bold text-[var(--ink-primary)] inline-flex items-center gap-2 group",
              isEditable && "cursor-text hover:bg-[var(--surface-sunken)] rounded-lg -mx-1.5 px-1.5"
            )}
          >
            {job.project_name}
            {isEditable && (
              <Icon icon="solar:pen-linear" className="text-[14px] text-[var(--ink-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </h1>
        )}

        {/* Description */}
        <div className="mt-1.5 max-w-2xl">
          {editingDesc ? (
            <div className="contract-quill">
              <ReactQuill theme="snow" value={desc} onChange={setDesc} modules={DESC_MODULES} placeholder="Describe this job…" />
              <div className="flex justify-end gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => { setDesc(job.project_description || ""); setEditingDesc(false); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveDesc} isLoading={updateJob.isPending}>Save</Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => isEditable && setEditingDesc(true)}
              className={cn("group", isEditable && "cursor-text hover:bg-[var(--surface-sunken)] rounded-lg -mx-1.5 px-1.5 py-0.5")}
            >
              <RichText
                html={job.project_description}
                emptyText={isEditable ? "Add a description…" : null}
              />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {job.customer?.name && (
            <span className="text-xs text-[var(--ink-tertiary)] flex items-center gap-1">
              <Icon icon="solar:buildings-2-linear" className="text-[13px]" /> {job.customer.name}
            </span>
          )}
          <DueDatePill
            date={job.due_date}
            status={job.status}
            onChange={saveDueDate}
            editable={isEditable}
          />
          {job.start_date && (
            <span className="text-xs text-[var(--ink-tertiary)]">Started {formatDate(job.start_date)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-none">
        <IconButton
          icon="solar:clock-circle-bold-duotone"
          label="Time logged on this job"
          onClick={() => navigate(`/jobs/${job.id}/work-diary`)}
        />
        {isEditable ? (
          <StatusMenu status={job.status} onChange={saveStatus} size="md" />
        ) : (
          <StatusPill status={job.status} size="md" />
        )}
        {canDelete && (
          <IconButton
            icon="solar:trash-bin-trash-linear"
            variant="danger"
            label="Delete job"
            onClick={() => setConfirmDelete(true)}
          />
        )}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this job?" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)]">
          <strong className="text-[var(--ink-primary)]">{job.project_name}</strong> will be removed from the portal
          along with everything under it — projects, tasks, comments and briefs will no longer be reachable.
        </p>
        <p className="text-xs text-[var(--ink-tertiary)] mt-2">
          Jobs are soft-deleted, so the data still exists in the database and can be restored by a developer —
          but nobody will see it in the app.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteJob.isPending} onClick={handleDelete}>Delete job</Button>
        </div>
      </Modal>
    </div>
  );
};

export default JobHeader;
