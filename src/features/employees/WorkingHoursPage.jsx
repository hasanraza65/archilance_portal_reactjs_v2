import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { Field, TextField } from "@/components/ui/Field";
import { fetchWorkingHours, createWorkingHour, updateWorkingHour, deleteWorkingHour } from "@/api/workingHours";
import { useEmployee } from "./useEmployeeMutations";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

/** "09:00:00" | "09:00" -> "09:00" for <input type="time">. */
const toInputTime = (t) => (t ? String(t).slice(0, 5) : "");

const to12h = (t) => {
  const [h, m] = toInputTime(t).split(":").map(Number);
  if (!Number.isFinite(h)) return "—";
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${suffix}`;
};

const minutesOf = (t) => {
  const [h, m] = toInputTime(t).split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : 0;
};

const durationLabel = (start, end) => {
  const mins = Math.max(0, minutesOf(end) - minutesOf(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
};

const DAY_START = 0;
const DAY_MINUTES = 24 * 60;

const WorkingHoursPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // slot being edited, or null for a new one
  const [form, setForm] = useState({ startTime: "09:00", endTime: "18:00" });

  const { data: employee } = useEmployee(employeeId);
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["working-hours", user?.role, employeeId],
    queryFn: () => fetchWorkingHours(user.role, employeeId),
    enabled: Boolean(user && employeeId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["working-hours"] });

  const saveMut = useMutation({
    mutationFn: ({ id, ...payload }) =>
      id
        ? updateWorkingHour(user.role, id, { employeeId, ...payload })
        : createWorkingHour(user.role, { employeeId, ...payload }),
    onSuccess: (_d, vars) => {
      invalidate();
      toast.success(vars.id ? "Slot updated." : "Slot added.");
      setModalOpen(false);
    },
    onError: (err) =>
      // 409 = overlaps an existing slot, 422 = end before start. Both come back
      // with a useful `message`, so surface it verbatim.
      toast.error(extractErrorMessage(err, "Couldn't save that slot.")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteWorkingHour(user.role, id),
    onSuccess: () => { invalidate(); toast.success("Slot removed."); },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't remove that slot.")),
  });

  const ordered = useMemo(
    () => [...slots].sort((a, b) => minutesOf(a.start_time) - minutesOf(b.start_time)),
    [slots]
  );

  const totalMinutes = ordered.reduce(
    (sum, s) => sum + Math.max(0, minutesOf(s.end_time) - minutesOf(s.start_time)),
    0
  );

  const openNew = () => {
    setEditing(null);
    setForm({ startTime: "09:00", endTime: "18:00" });
    setModalOpen(true);
  };

  const openEdit = (slot) => {
    setEditing(slot);
    setForm({ startTime: toInputTime(slot.start_time), endTime: toInputTime(slot.end_time) });
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime) return toast.error("Both times are required.");
    if (minutesOf(form.endTime) <= minutesOf(form.startTime)) {
      return toast.error("End time must be after the start time.");
    }
    saveMut.mutate({ id: editing?.id, startTime: `${form.startTime}:00`, endTime: `${form.endTime}:00` });
  };

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-3xl"
        title="Working Hours"
        subtitle={
          isLoading
            ? "Loading…"
            : `${ordered.length} slot${ordered.length === 1 ? "" : "s"} · ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m expected per day`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="solar:arrow-left-linear" onClick={() => navigate(`/employees/${employeeId}`)}>
              Back
            </Button>
            <Button icon="solar:add-circle-bold" onClick={openNew}>Add slot</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto space-y-4">
        {employee && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] px-4 py-3">
            <Avatar name={employee.name} src={employee.profile_pic ? getMediaUrl(employee.profile_pic) : null} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ink-primary)] truncate">{employee.name}</p>
              <p className="text-xs text-[var(--ink-tertiary)] truncate">{employee.email}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] px-4 py-3">
          <Icon icon="solar:clock-circle-bold-duotone" className="text-[16px] text-primary-500 mt-0.5 flex-none" />
          <p className="text-xs text-[var(--ink-secondary)]">
            These are the hours this person is <strong className="text-[var(--ink-primary)]">expected</strong> to be
            working. They apply to every working day and can't overlap each other — split a shift into two slots to
            model a lunch break.
          </p>
        </div>

        {/* Day timeline */}
        {ordered.length > 0 && (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-center justify-between text-[10px] text-[var(--ink-tertiary)] mb-1.5">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
            </div>
            <div className="relative h-8 rounded-lg bg-[var(--surface-sunken)] overflow-hidden">
              {ordered.map((s) => {
                const left = ((minutesOf(s.start_time) - DAY_START) / DAY_MINUTES) * 100;
                const width = Math.max(0.5, ((minutesOf(s.end_time) - minutesOf(s.start_time)) / DAY_MINUTES) * 100);
                return (
                  <div
                    key={s.id}
                    title={`${to12h(s.start_time)} – ${to12h(s.end_time)}`}
                    className="absolute top-0 h-full bg-primary-500/80 hover:bg-primary-500 transition-colors"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Slots */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : ordered.length === 0 ? (
          <EmptyState
            icon="solar:stopwatch-bold-duotone"
            title="No working hours set"
            description="Add a slot to record the hours this employee is expected to work each day."
            action={<Button icon="solar:add-circle-bold" onClick={openNew}>Add slot</Button>}
          />
        ) : (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)] overflow-hidden">
            {ordered.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-lg bg-primary-500/12 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-none">
                  <Icon icon="solar:clock-circle-bold-duotone" className="text-[17px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--ink-primary)]">
                    {to12h(s.start_time)} <span className="text-[var(--ink-tertiary)] font-normal">→</span> {to12h(s.end_time)}
                  </p>
                  <p className="text-xs text-[var(--ink-tertiary)]">{durationLabel(s.start_time, s.end_time)} per day</p>
                </div>
                <IconButton icon="solar:pen-linear" size="sm" label="Edit slot" onClick={() => openEdit(s)} />
                <IconButton
                  icon="solar:trash-bin-trash-linear"
                  size="sm"
                  variant="danger"
                  label="Delete slot"
                  onClick={() => deleteMut.mutate(s.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit working hours" : "Add working hours"}
        className="max-w-md"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" required>
              <TextField
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </Field>
            <Field label="End time" required>
              <TextField
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </Field>
          </div>

          {form.startTime && form.endTime && minutesOf(form.endTime) > minutesOf(form.startTime) && (
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1.5">
              <Icon icon="solar:clock-circle-linear" className="text-[13px]" />
              {durationLabel(form.startTime, form.endTime)} per working day
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={saveMut.isPending}>{editing ? "Save changes" : "Add slot"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkingHoursPage;
