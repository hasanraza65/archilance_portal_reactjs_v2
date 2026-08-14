import React, { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import { useCreateLeaveOnBehalf } from "./useLeaveData";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const TYPES = [
  { value: "casual", label: "Casual" },
  // Additional (BIM Team public-holiday compensation, its own 8-day pool) is
  // listed for everyone here since we don't know the selected employee's team
  // until they're chosen — the backend rejects it outright for a non-BIM
  // employee with a clear message, same as every other policy check below.
  { value: "additional", label: "Additional (BIM Team only)" },
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "marriage", label: "Marriage" },
  { value: "unpaid", label: "Unpaid" },
];

const FIELD =
  "w-full h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/30";

const emptyForm = {
  userId: "",
  leaveType: "casual",
  startDate: null,
  endDate: null,
  reason: "",
  status: "Approved",
};

/**
 * Record leave on an employee's behalf — the management exception route from the
 * leave policy (e.g. Annual Leave approved at short notice).
 *
 * Two-step by design: the first submit is validated against the policy exactly
 * as an employee's own request would be. If it breaches a rule the backend
 * replies 422 with the reason, which is shown here for confirmation before the
 * request is re-sent with an explicit override + justification.
 */
const RecordLeaveModal = ({ open, onClose }) => {
  const { data: employees = [] } = useAllEmployees();
  const createOnBehalf = useCreateLeaveOnBehalf();

  const [form, setForm] = useState(emptyForm);
  const [violation, setViolation] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [employees]
  );

  const close = () => {
    setForm(emptyForm);
    setViolation(null);
    setOverrideReason("");
    onClose?.();
  };

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    // Any change invalidates a violation raised for the previous values.
    setViolation(null);
  };

  const submit = async (e, override = false) => {
    e?.preventDefault();

    if (!form.userId) return toast.error("Please choose an employee.");
    if (!form.startDate || !form.endDate) return toast.error("Please choose the start and end dates.");
    if (override && !overrideReason.trim()) return toast.error("Please record why this exception is being made.");

    try {
      await createOnBehalf.mutateAsync({
        userId: form.userId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || null,
        status: form.status,
        override,
        overrideReason: overrideReason.trim(),
      });
      toast.success(override ? "Leave recorded as a policy exception." : "Leave recorded.");
      close();
    } catch (err) {
      const data = err?.response?.data;
      // A policy breach comes back as a 422 the manager can consciously override.
      if (err?.response?.status === 422 && data?.policy_violation && data?.can_override) {
        setViolation(data.policy_violation);
        return;
      }
      toast.error(extractErrorMessage(err, "Couldn't record this leave."));
    }
  };

  return (
    <Modal open={open} onClose={close} title="Record leave for an employee" className="max-w-lg">
      <form onSubmit={(e) => submit(e, false)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Employee</label>
          <select className={FIELD} value={form.userId} onChange={(e) => set({ userId: e.target.value })}>
            <option value="">Select an employee…</option>
            {sortedEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
                {emp.employee_team ? ` — ${emp.employee_team}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Leave type</label>
          <select className={FIELD} value={form.leaveType} onChange={(e) => set({ leaveType: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label} Leave</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "startDate", label: "Start date" },
            { key: "endDate", label: "End date" },
          ].map(({ key, label }) => (
            <DatePicker
              key={key}
              anchorClassName="flex w-full"
              value={form[key]}
              onChange={(d) => set({ [key]: d })}
              trigger={
                <span className="w-full flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-sm cursor-pointer hover:border-primary-400 transition-colors">
                  <Icon icon="solar:calendar-linear" className="text-primary-500 text-[17px] flex-none" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] text-[var(--ink-tertiary)]">{label}</span>
                    <span className={form[key] ? "text-[var(--ink-primary)] font-medium" : "text-[var(--ink-tertiary)]"}>
                      {form[key] ? formatDate(form[key]) : "Select date"}
                    </span>
                  </span>
                </span>
              }
            />
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Status</label>
          <select className={FIELD} value={form.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Reason / note</label>
          <textarea
            value={form.reason}
            onChange={(e) => set({ reason: e.target.value.slice(0, 200) })}
            rows={2}
            maxLength={200}
            className="w-full px-3.5 py-3 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            placeholder="Optional context for this entry…"
          />
        </div>

        {violation ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3.5 flex items-start gap-2.5">
              <Icon icon="solar:danger-triangle-bold" className="text-amber-600 dark:text-amber-400 text-[17px] flex-none mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">This falls outside the leave policy</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mt-1">{violation}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">
                Reason for the exception <span className="text-red-500">*</span>
              </label>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value.slice(0, 200))}
                className={FIELD}
                placeholder="e.g. Family emergency — approved by HR"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setViolation(null)}>
                Change details
              </Button>
              <Button
                type="button"
                className="flex-1"
                icon="solar:shield-check-bold"
                isLoading={createOnBehalf.isPending}
                onClick={(e) => submit(e, true)}
              >
                Record anyway
              </Button>
            </div>
          </div>
        ) : (
          <Button type="submit" size="lg" icon="solar:calendar-add-bold" isLoading={createOnBehalf.isPending} className="w-full">
            Record leave
          </Button>
        )}
      </form>
    </Modal>
  );
};

export default RecordLeaveModal;
