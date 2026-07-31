import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import EmptyState from "@/components/ui/EmptyState";
import SearchSelect from "@/components/ui/SearchSelect";
import DateField from "@/components/ui/DateField";
import { Field, TextArea } from "@/components/ui/Field";
import RatingCard from "./RatingCard";
import { ScorePicker, scoreTone } from "./ScoreBar";
import { useMyInternees, useInterneeRatings, useSaveInterneeRating } from "./useInterneeData";
import { RATING_FIELDS, ratingAverage } from "@/api/internee";
import { useJobs, useJobRootTasks } from "@/features/jobs/useJobsData";
import { getMediaUrl } from "@/api/media";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const blankScores = () => Object.fromEntries(RATING_FIELDS.map((f) => [f.key, 3]));

/**
 * Manager/executive view: grade the interns you manage.
 *
 * Two server rules shape this screen:
 *  - a grade is stored against the task's ROOT task, so grading a sub-task and
 *    its parent collide — the task picker therefore offers root tasks only;
 *  - one grade per (manager, internee, root task, date) — a duplicate is a 422.
 */
const InterneeGradingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const interneeFilter = searchParams.get("internee") || null;

  const { data: internees = [], isLoading: loadingInternees } = useMyInternees();
  const { data: data, isLoading } = useInterneeRatings({
    page,
    interneeId: interneeFilter || undefined,
  });

  const [form, setForm] = useState({
    interneeId: null, jobId: null, taskId: null,
    ratingDate: yesterday(), didNotWork: false,
    scores: blankScores(), comments: "",
  });

  const { data: jobs = [] } = useJobs();
  const { data: rootTasks = [], isLoading: loadingTasks } = useJobRootTasks(form.jobId, Boolean(form.jobId) && modalOpen);

  const saveMut = useSaveInterneeRating();
  const rows = data?.items || [];

  // Default the picker to the only intern, so the common case is zero clicks.
  useEffect(() => {
    if (modalOpen && !form.interneeId && internees.length === 1) {
      setForm((f) => ({ ...f, interneeId: internees[0].id }));
    }
  }, [modalOpen, internees, form.interneeId]);

  const openNew = () => {
    setEditing(null);
    setForm({
      interneeId: interneeFilter ? Number(interneeFilter) : internees.length === 1 ? internees[0].id : null,
      jobId: null, taskId: null,
      ratingDate: yesterday(), didNotWork: false,
      scores: blankScores(), comments: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      interneeId: row.internee_id,
      jobId: row.task?.project_id || null,
      taskId: row.task_id,
      ratingDate: String(row.rating_date).slice(0, 10),
      didNotWork: Boolean(row.did_not_work),
      scores: Object.fromEntries(RATING_FIELDS.map((f) => [f.key, Number(row[f.key]) || 0])),
      comments: row.comments || "",
    });
    setModalOpen(true);
  };

  const liveAverage = useMemo(() => {
    if (form.didNotWork) return 0;
    const vals = RATING_FIELDS.map((f) => Number(form.scores[f.key]) || 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [form.scores, form.didNotWork]);

  const submit = async (e) => {
    e.preventDefault();
    if (!editing) {
      if (!form.interneeId) return toast.error("Pick an internee.");
      if (!form.taskId) return toast.error("Pick the task they worked on.");
      if (!form.ratingDate) return toast.error("Pick the date being graded.");
    }
    try {
      await saveMut.mutateAsync({
        id: editing?.id,
        interneeId: form.interneeId,
        taskId: form.taskId,
        ratingDate: form.ratingDate,
        didNotWork: form.didNotWork,
        scores: form.scores,
        comments: form.comments,
      });
      toast.success(editing ? "Grade updated." : "Grade saved.");
      setModalOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't save that grade."));
    }
  };

  const setInterneeFilter = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("internee", String(id));
    else next.delete("internee");
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const tone = scoreTone(liveAverage);

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-3xl"
        title="Internee Grading"
        subtitle={
          loadingInternees
            ? "Loading…"
            : `${internees.length} intern${internees.length === 1 ? "" : "s"} · ${data?.total ?? 0} grade${data?.total === 1 ? "" : "s"} recorded`
        }
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchSelect
              options={internees.map((i) => ({ value: i.id, label: i.name }))}
              value={interneeFilter ? Number(interneeFilter) : null}
              onChange={setInterneeFilter}
              placeholder="All interns"
              clearable
              size="sm"
              className="w-full sm:w-44"
            />
            <Button icon="solar:add-circle-bold" onClick={openNew} disabled={internees.length === 0}>
              Grade a day
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto space-y-4">
        {/* Intern strip */}
        {internees.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {internees.map((i) => {
              const active = String(interneeFilter) === String(i.id);
              const theirs = rows.filter((r) => String(r.internee_id) === String(i.id));
              const avg = theirs.length ? theirs.reduce((s, r) => s + ratingAverage(r), 0) / theirs.length : null;
              return (
                <button
                  key={i.id}
                  onClick={() => setInterneeFilter(active ? null : i.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2 flex-none transition-colors",
                    active
                      ? "border-primary-400 bg-primary-500/8"
                      : "border-[var(--line-subtle)] bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)]"
                  )}
                >
                  <Avatar name={i.name} src={i.profile_pic ? getMediaUrl(i.profile_pic) : null} size="sm" />
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-[var(--ink-primary)] whitespace-nowrap">{i.name}</p>
                    <p className="text-[10px] text-[var(--ink-tertiary)]">
                      {avg === null ? "No grades on this page" : `${avg.toFixed(1)} avg`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        ) : internees.length === 0 ? (
          <EmptyState
            icon="solar:users-group-rounded-linear"
            title="No interns assigned to you"
            description="An admin sets an intern's grading manager on their employee profile."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="solar:medal-ribbons-star-bold-duotone"
            title="No grades recorded yet"
            description="Grade a day to start building each intern's record."
            action={<Button icon="solar:add-circle-bold" onClick={openNew}>Grade a day</Button>}
          />
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((r) => <RatingCard key={r.id} row={r} onEdit={openEdit} />)}
            </div>

            {data?.lastPage > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--ink-tertiary)]">Page {data.currentPage} of {data.lastPage}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
                  <button disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Grade form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit grade" : "Grade a day"}
        className="max-w-xl"
        footer={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="grade-form" isLoading={saveMut.isPending} icon="solar:check-circle-bold" className="flex-1 sm:flex-none">
              {editing ? "Save changes" : "Save grade"}
            </Button>
          </div>
        }
      >
        <form id="grade-form" onSubmit={submit} className="space-y-4">
          {!editing && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Internee" required>
                  <SearchSelect
                    options={internees.map((i) => ({ value: i.id, label: i.name }))}
                    value={form.interneeId}
                    onChange={(v) => setForm((f) => ({ ...f, interneeId: v }))}
                    placeholder="Choose an intern"
                    size="lg"
                  />
                </Field>
                <Field label="Date" required hint="Can't be in the future">
                  <DateField
                    value={form.ratingDate}
                    onChange={(d) => setForm((f) => ({ ...f, ratingDate: d }))}
                    clearable={false}
                    align="right"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Job" required>
                  <SearchSelect
                    options={jobs.map((j) => ({ value: j.id, label: j.project_name }))}
                    value={form.jobId}
                    onChange={(v) => setForm((f) => ({ ...f, jobId: v, taskId: null }))}
                    placeholder="Choose a job"
                    size="lg"
                  />
                </Field>
                <Field
                  label="Project"
                  required
                  hint="Grades roll up to the top-level item, so only these are listed"
                >
                  <SearchSelect
                    options={rootTasks.map((t) => ({ value: t.id, label: t.task_title }))}
                    value={form.taskId}
                    onChange={(v) => setForm((f) => ({ ...f, taskId: v }))}
                    placeholder={!form.jobId ? "Pick a job first" : loadingTasks ? "Loading…" : "Choose a project"}
                    disabled={!form.jobId}
                    size="lg"
                  />
                </Field>
              </div>
            </>
          )}

          {editing && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-sunken)] px-3.5 py-2.5">
              <Avatar name={editing.internee?.name} src={editing.internee?.profile_pic ? getMediaUrl(editing.internee.profile_pic) : null} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink-primary)] truncate">{editing.internee?.name}</p>
                <p className="text-[11px] text-[var(--ink-tertiary)] truncate">
                  {editing.task?.task_title} · {String(editing.rating_date).slice(0, 10)}
                </p>
              </div>
            </div>
          )}

          {/* Did not work */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--line-subtle)] px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink-primary)]">Didn't work this day</p>
              <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                Records a zero across the board and skips the scores below.
              </p>
            </div>
            <Toggle
              checked={form.didNotWork}
              onChange={(v) => setForm((f) => ({ ...f, didNotWork: v }))}
              label="Didn't work this day"
            />
          </div>

          {!form.didNotWork && (
            <div className="space-y-3">
              {RATING_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--ink-primary)]">{f.label}</p>
                    <p className="text-[11px] text-[var(--ink-tertiary)]">{f.hint}</p>
                  </div>
                  <ScorePicker
                    value={form.scores[f.key]}
                    onChange={(n) => setForm((s) => ({ ...s, scores: { ...s.scores, [f.key]: n } }))}
                  />
                </div>
              ))}

              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-sunken)] px-3.5 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Average
                </span>
                <span className={cn("text-lg font-bold", tone.text)}>
                  {liveAverage.toFixed(1)} <span className="text-xs font-normal text-[var(--ink-tertiary)]">/ 5 · {tone.label}</span>
                </span>
              </div>
            </div>
          )}

          <Field label="Comments" hint="Optional — visible to the internee">
            <TextArea
              rows={2}
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              placeholder="What went well, what to work on…"
            />
          </Field>

        </form>
      </Modal>
    </div>
  );
};

export default InterneeGradingPage;
