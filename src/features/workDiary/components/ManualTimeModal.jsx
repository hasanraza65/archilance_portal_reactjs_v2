import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import SearchSelect from "@/components/ui/SearchSelect";
import DatePicker from "@/components/ui/DatePicker";
import { fetchProjects, fetchProject } from "@/api/projects";
import { createManualTime } from "@/api/workSessions";
import { useAuth } from "@/auth/AuthContext";
import { formatDate, formatDuration } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Log time that wasn't tracked live. Mirrors v1's POST /manual-time contract. */
const ManualTimeModal = ({ open, onClose }) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [jobId, setJobId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [memo, setMemo] = useState("");
  const [proof, setProof] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["diary-jobs", user?.role],
    queryFn: () => fetchProjects(user.role, {}),
    enabled: Boolean(user) && open,
    staleTime: 5 * 60_000,
  });

  const { data: jobDetail } = useQuery({
    queryKey: ["diary-job-tasks", user?.role, jobId],
    queryFn: () => fetchProject(user.role, jobId),
    enabled: Boolean(user) && Boolean(jobId),
    staleTime: 5 * 60_000,
  });

  const jobOptions = useMemo(() => jobs.map((j) => ({ value: j.id, label: j.project_name })), [jobs]);

  // Flat list with parents shown as sublabels, so a sub-task is unambiguous.
  const taskOptions = useMemo(() => {
    const all = jobDetail?.all_tasks || [];
    const titleById = new Map(all.map((t) => [t.id, t.task_title]));
    return all.map((t) => ({
      value: t.id,
      label: t.task_title,
      sublabel: t.parent_task_id ? titleById.get(t.parent_task_id) : undefined,
    }));
  }, [jobDetail]);

  const durationSeconds = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return 0;
    const s = new Date(`${startDate}T${startTime}:00`);
    const e = new Date(`${endDate}T${endTime}:00`);
    const diff = (e - s) / 1000;
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }, [startDate, endDate, startTime, endTime]);

  const reset = () => {
    setJobId(null); setTaskId(null);
    setStartDate(todayIso()); setEndDate(todayIso());
    setStartTime("09:00"); setEndTime("17:00");
    setMemo(""); setProof(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!taskId) return toast.error("Please choose the task you worked on.");
    if (durationSeconds <= 0) return toast.error("End time must be after the start time.");
    if (!memo.trim()) return toast.error("Please add a short note describing the work.");

    setSaving(true);
    try {
      await createManualTime(user.role, {
        taskId,
        startDate,
        startTime: `${startTime}:00`,
        endDate,
        endTime: `${endTime}:00`,
        memo: memo.trim(),
        proofPdf: proof,
      });
      toast.success(`Logged ${formatDuration(durationSeconds)} of manual time.`);
      qc.invalidateQueries({ queryKey: ["my-work-sessions"] });
      qc.invalidateQueries({ queryKey: ["employee-work-sessions"] });
      reset();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't save the manual time entry."));
    } finally {
      setSaving(false);
    }
  };

  const dateTrigger = (value, placeholder) => (
    <span className="w-full flex items-center justify-between px-3 h-10 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm cursor-pointer">
      <span className={value ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]"}>
        {value ? formatDate(value) : placeholder}
      </span>
      <Icon icon="solar:calendar-linear" className="text-[var(--ink-tertiary)] text-[14px]" />
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add manual time"
      className="max-w-lg"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="manual-time-form" icon="solar:add-circle-bold" isLoading={saving} className="flex-1 sm:flex-none">Log time</Button>
        </div>
      }
    >
      <form id="manual-time-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Job</label>
          <SearchSelect
            options={jobOptions}
            value={jobId}
            onChange={(v) => { setJobId(v); setTaskId(null); }}
            placeholder="Choose a job…"
            searchPlaceholder="Search jobs…"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Project / Task</label>
          <SearchSelect
            options={taskOptions}
            value={taskId}
            onChange={setTaskId}
            placeholder={jobId ? "Choose what you worked on…" : "Pick a job first"}
            searchPlaceholder="Search projects & tasks…"
            disabled={!jobId}
            emptyText="Nothing in this job yet"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Start date</label>
            <DatePicker anchorClassName="flex w-full" value={startDate} onChange={(d) => { setStartDate(d); if (!endDate || endDate < d) setEndDate(d); }} trigger={dateTrigger(startDate, "Select")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">End date</label>
            <DatePicker anchorClassName="flex w-full" value={endDate} onChange={setEndDate} align="right" trigger={dateTrigger(endDate, "Select")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Start time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">End time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
        </div>

        {durationSeconds > 0 && (
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1.5">
            <Icon icon="solar:stopwatch-bold-duotone" className="text-[13px]" />
            {formatDuration(durationSeconds)} will be logged
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">What did you work on?</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="Briefly describe the work so it can be reviewed…"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">
            Proof (optional PDF)
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setProof(e.target.files?.[0] || null)}
            className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:text-[var(--ink-secondary)] file:text-xs"
          />
        </div>

      </form>
    </Modal>
  );
};

export default ManualTimeModal;
