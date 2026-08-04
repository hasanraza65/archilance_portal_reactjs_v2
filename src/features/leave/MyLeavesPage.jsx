import React, { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import { useMyLeaveEnvelope, useCreateLeaveRequest } from "./useLeaveData";
import { LEAVE_TYPES } from "@/api/leave";
import { LEAVE_ENTITLEMENTS, balanceTone } from "./leaveEntitlements";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const STATUS_TONE = { Pending: "warning", Approved: "success", Rejected: "danger" };

// Must stay in sync with ADDITIONAL_LEAVE_USER_IDS in the backend's
// employee/LeaveRequestController — the backend rejects `additional` from
// anyone else, so showing the option more widely would only produce 422s.
// NOTE: user 177 was intentionally removed — they no longer get additional leaves.
const ADDITIONAL_LEAVE_USER_IDS = [109, 171, 22, 173, 50, 172, 147, 118, 35, 180, 114, 69, 182, 23, 26, 21, 128, 175, 139, 28, 58, 162];

const MyLeavesPage = () => {
  const { user } = useAuth();
  const { data: envelope, isLoading } = useMyLeaveEnvelope();
  const requests = envelope?.data;
  const usedByType = envelope?.types || {};
  const cycle = envelope?.cycle;
  const createLeave = useCreateLeaveRequest();

  const isEligibleForAdditional = ADDITIONAL_LEAVE_USER_IDS.includes(user?.id);
  // Same rules the Staff Leaves balance modal uses, so the two views can never
  // disagree. "other" is a reason label, not a balance; additional only shows
  // for the whitelisted users.
  const balanceRules = LEAVE_ENTITLEMENTS.filter(
    (e) => e.key !== "other" && (e.key !== "additional" || isEligibleForAdditional)
  );
  const typeOptions = [
    ...LEAVE_TYPES,
    ...(isEligibleForAdditional ? [{ value: "additional", label: "Additional Absences" }] : []),
  ];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: null, endDate: null, leaveType: "casual", otherType: "", reason: "" });

  const resetForm = () => setForm({ startDate: null, endDate: null, leaveType: "casual", otherType: "", reason: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      return toast.error("Please fill in the dates and a reason.");
    }
    if (form.leaveType === "other" && !form.otherType.trim()) {
      return toast.error('Please specify the reason for "Other" leave type.');
    }
    const finalReason = form.leaveType === "other" ? `[Other - ${form.otherType.trim()}]: ${form.reason.trim()}` : form.reason.trim();
    const finalType = form.leaveType === "other" ? "casual" : form.leaveType;
    try {
      await createLeave.mutateAsync({ startDate: form.startDate, endDate: form.endDate, reason: finalReason, leaveType: finalType });
      toast.success("Leave request submitted.");
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't submit your leave request."));
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="My Leaves" subtitle="Apply for leave and track your requests." actions={<Button icon="solar:add-circle-bold" onClick={() => setOpen(true)}>Apply for Leave</Button>} />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        {/* Balances for the current cycle — parity with v1's LeaveHistoryTable
            cards and v2's own Staff Leaves balance modal. */}
        {!isLoading && (
          <div>
            {cycle && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink-tertiary)] mb-2">
                <Icon icon="solar:restart-linear" className="text-[12px] text-primary-500" />
                Leave cycle {formatDate(cycle.start)} – {formatDate(cycle.end)} · balances renew on your joining anniversary
              </p>
            )}
            <div className={`grid grid-cols-2 gap-3 ${balanceRules.length > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {balanceRules.map((rule) => {
                const used = Number(usedByType[rule.key] || 0);
                const remaining = Math.max(0, rule.total - used);
                const pct = Math.min(100, (used / rule.total) * 100);
                const tone = balanceTone(remaining);
                return (
                  <div key={rule.key} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--ink-primary)]">{rule.label}</span>
                      <span className={`text-[11px] font-semibold ${tone.text}`}>{remaining} left</span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-tertiary)] mb-2">{used} of {rule.total} used</p>
                    <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        ) : !requests?.length ? (
          <EmptyState icon="solar:calendar-mark-linear" title="No leave requests yet" description="Click Apply for Leave to submit your first request." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--ink-primary)] capitalize">{r.leave_type} Leave</span>
                      <Badge tone={STATUS_TONE[r.status] || "neutral"}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--ink-tertiary)] flex items-center gap-1.5">
                      <Icon icon="solar:calendar-linear" className="text-[12px]" />
                      {formatDate(r.start_date)} – {formatDate(r.end_date)}
                    </p>
                    {r.reason && <p className="text-xs text-[var(--ink-secondary)] mt-1.5">{r.reason}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for Leave" className="max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-2">Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                anchorClassName="flex w-full"
                value={form.startDate}
                onChange={(d) => setForm((f) => ({ ...f, startDate: d }))}
                trigger={
                  <span className="w-full flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-sm cursor-pointer hover:border-primary-400 transition-colors">
                    <Icon icon="solar:calendar-linear" className="text-primary-500 text-[17px] flex-none" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-[var(--ink-tertiary)]">Start date</span>
                      <span className={form.startDate ? "text-[var(--ink-primary)] font-medium" : "text-[var(--ink-tertiary)]"}>
                        {form.startDate ? formatDate(form.startDate) : "Select date"}
                      </span>
                    </span>
                  </span>
                }
              />
              <DatePicker
                anchorClassName="flex w-full"
                value={form.endDate}
                onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
                trigger={
                  <span className="w-full flex items-center gap-2.5 px-3.5 h-12 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-sm cursor-pointer hover:border-primary-400 transition-colors">
                    <Icon icon="solar:calendar-linear" className="text-primary-500 text-[17px] flex-none" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-[var(--ink-tertiary)]">End date</span>
                      <span className={form.endDate ? "text-[var(--ink-primary)] font-medium" : "text-[var(--ink-tertiary)]"}>
                        {form.endDate ? formatDate(form.endDate) : "Select date"}
                      </span>
                    </span>
                  </span>
                }
              />
            </div>
            {form.startDate && form.endDate && (
              <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium mt-2 flex items-center gap-1">
                <Icon icon="solar:clock-circle-linear" className="text-[12px]" />
                {Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)} day(s) of leave
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-2">Leave type</label>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, leaveType: t.value }))}
                  className={`flex items-center gap-2 px-3.5 h-11 rounded-xl border text-sm font-medium transition-colors ${
                    form.leaveType === t.value
                      ? "border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                      : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center ${
                      form.leaveType === t.value ? "border-primary-500" : "border-[var(--line-strong)]"
                    }`}
                  >
                    {form.leaveType === t.value && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.leaveType === "other" && (
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Specify type</label>
              <input
                value={form.otherType}
                onChange={(e) => setForm((f) => ({ ...f, otherType: e.target.value }))}
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                placeholder="e.g. Bereavement"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--ink-secondary)]">Reason</label>
              <span className="text-[10px] text-[var(--ink-tertiary)]">{form.reason.length}/200</span>
            </div>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value.slice(0, 200) }))}
              rows={3}
              maxLength={200}
              className="w-full px-3.5 py-3 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="Briefly explain your leave request…"
            />
          </div>

          <Button type="submit" size="lg" icon="solar:paper-plane-bold" isLoading={createLeave.isPending} className="w-full">Submit Request</Button>
        </form>
      </Modal>
    </div>
  );
};

export default MyLeavesPage;
