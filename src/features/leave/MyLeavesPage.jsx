import React, { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import { useMyLeaveRequests, useCreateLeaveRequest } from "./useLeaveData";
import { LEAVE_TYPES } from "@/api/leave";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const STATUS_TONE = { Pending: "warning", Approved: "success", Rejected: "danger" };

const MyLeavesPage = () => {
  const { data: requests, isLoading } = useMyLeaveRequests();
  const createLeave = useCreateLeaveRequest();
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

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
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
              {LEAVE_TYPES.map((t) => (
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
