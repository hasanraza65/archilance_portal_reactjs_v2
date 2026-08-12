import React, { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import { useMyLeaveEnvelope, useCreateLeaveRequest } from "./useLeaveData";
import { leaveTypeOptions } from "@/api/leave";
import { balanceRulesFromPolicy, balanceTone, unitLabel } from "./leaveEntitlements";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const STATUS_TONE = { Pending: "warning", Approved: "success", Rejected: "danger" };

// Legacy fallback only — used when talking to a backend that predates the
// leave policy and therefore sends no `policy` block. Once the policy backend
// is live the BIM team's extra days come through as a larger Casual balance.
const ADDITIONAL_LEAVE_USER_IDS = [109, 171, 22, 173, 50, 172, 147, 118, 35, 180, 114, 69, 182, 23, 26, 21, 128, 175, 139, 28, 58, 162];

/** Inclusive day span, counted the way the chosen leave type is counted. */
function countDays(start, end, unit) {
  if (!start || !end) return 0;
  const from = new Date(start);
  const to = new Date(end);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  if (to < from) return 0;

  if (unit === "calendar_days") {
    return Math.round((to - from) / 86400000) + 1;
  }
  let days = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

const MyLeavesPage = () => {
  const { user } = useAuth();
  const { data: envelope, isLoading } = useMyLeaveEnvelope();
  const requests = envelope?.data;
  const usedByType = envelope?.types || {};
  const policy = envelope?.policy || null;
  const cycle = policy?.cycle || envelope?.cycle;
  const createLeave = useCreateLeaveRequest();

  const canApply = policy ? policy.can_apply !== false : true;
  const isEligibleForAdditional = ADDITIONAL_LEAVE_USER_IDS.includes(user?.id);

  const balanceRules = useMemo(
    () => balanceRulesFromPolicy(policy, usedByType, { includeAdditional: isEligibleForAdditional }),
    [policy, usedByType, isEligibleForAdditional]
  );
  const typeOptions = useMemo(() => leaveTypeOptions(policy), [policy]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: null, endDate: null, leaveType: "casual", otherType: "", reason: "" });

  const resetForm = () => setForm({ startDate: null, endDate: null, leaveType: "casual", otherType: "", reason: "" });

  const selectedType = typeOptions.find((t) => t.value === form.leaveType);
  const selectedEntitlement = policy?.entitlements?.[form.leaveType] || null;
  // "Other" is filed as Casual, so it is counted in working days like Casual.
  const activeUnit = selectedEntitlement?.unit || "working_days";
  const dayCount = countDays(form.startDate, form.endDate, activeUnit);

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
      <PageHeader
        title="My Leaves"
        subtitle="Apply for leave and track your requests."
        actions={canApply ? <Button icon="solar:add-circle-bold" onClick={() => setOpen(true)}>Apply for Leave</Button> : null}
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        {/* Employees outside the entitlement policy (internees, Outsource
            Department) keep their history but cannot file new requests. */}
        {policy && !canApply && (
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 flex items-start gap-3">
            <Icon icon="solar:info-circle-bold" className="text-amber-600 dark:text-amber-400 text-[18px] flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Leave entitlements do not apply to your role</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">{policy.restricted_reason}</p>
            </div>
          </div>
        )}

        {policy?.on_probation && canApply && (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4 flex items-start gap-3">
            <Icon icon="solar:shield-user-linear" className="text-primary-500 text-[18px] flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink-primary)]">You are on probation</p>
              <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">
                Annual Leave becomes available once probation is complete
                {policy.probation_end_date ? ` on ${formatDate(policy.probation_end_date)}` : ""}. Casual Leave is
                limited to {policy.rules?.casual_probation_max ?? 3} days during probation; Sick Leave is unaffected.
              </p>
            </div>
          </div>
        )}

        {!isLoading && canApply && (
          <div>
            {cycle && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink-tertiary)] mb-2">
                <Icon icon="solar:restart-linear" className="text-[12px] text-primary-500" />
                Leave cycle {formatDate(cycle.start)} – {formatDate(cycle.end)} · balances renew on your joining anniversary
                {policy?.is_bim_team ? " · BIM Team entitlement" : ""}
              </p>
            )}
            <div className={`grid grid-cols-2 gap-3 ${balanceRules.length > 3 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-3"}`}>
              {balanceRules.map((rule) => {
                const uncapped = rule.total === null || rule.total === undefined;
                const remaining = uncapped ? null : Math.max(0, rule.remaining ?? rule.total - rule.used);
                const pct = uncapped || !rule.total ? 0 : Math.min(100, (rule.used / rule.total) * 100);
                const tone = uncapped ? null : balanceTone(remaining);
                return (
                  <div
                    key={rule.key}
                    className={`rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-3.5 ${
                      rule.available === false ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs font-semibold text-[var(--ink-primary)]">{rule.label}</span>
                      {uncapped ? (
                        <span className="text-[11px] font-semibold text-[var(--ink-tertiary)]">No limit</span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${tone.text}`}>{remaining} left</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--ink-tertiary)] mb-2">
                      {uncapped ? `${rule.used} used` : `${rule.used} of ${rule.total} used`}
                      <span className="opacity-70"> · {unitLabel(rule.unit)}</span>
                    </p>
                    <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                      {!uncapped && <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />}
                    </div>
                    {rule.scope === "employment" && (
                      <p className="text-[10px] text-[var(--ink-tertiary)] mt-1.5">Once per employment</p>
                    )}
                    {rule.note && <p className="text-[10px] text-[var(--ink-tertiary)] mt-1.5">{rule.note}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        ) : !requests?.length ? (
          <EmptyState icon="solar:calendar-mark-linear" title="No leave requests yet" description={canApply ? "Click Apply for Leave to submit your first request." : "You have no leave history."} />
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
                {dayCount} {unitLabel(activeUnit)} of leave
                {activeUnit === "calendar_days" && <span className="opacity-70">· weekends included</span>}
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
                  disabled={t.disabled}
                  title={t.disabled ? t.note || "Not available" : undefined}
                  onClick={() => !t.disabled && setForm((f) => ({ ...f, leaveType: t.value }))}
                  className={`flex items-center gap-2 px-3.5 h-11 rounded-xl border text-sm font-medium transition-colors ${
                    t.disabled
                      ? "border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-[var(--ink-tertiary)] cursor-not-allowed opacity-60"
                      : form.leaveType === t.value
                      ? "border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                      : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center ${
                      form.leaveType === t.value && !t.disabled ? "border-primary-500" : "border-[var(--line-strong)]"
                    }`}
                  >
                    {form.leaveType === t.value && !t.disabled && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* The rule that applies to whatever is selected, stated up front so
                a request is not submitted only to bounce back with a 422. */}
            {selectedType?.note && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                <Icon icon="solar:info-circle-linear" className="text-[12px] mt-0.5 flex-none" />
                {selectedType.note}
              </p>
            )}
            {policy?.rules && !selectedType?.note && (
              <p className="text-[11px] text-[var(--ink-tertiary)] mt-2 flex items-start gap-1.5">
                <Icon icon="solar:info-circle-linear" className="text-[12px] mt-0.5 flex-none" />
                {form.leaveType === "annual" &&
                  `Request at least ${policy.rules.annual_notice_days} days ahead. Weekends inside the block count as Annual Leave, and two blocks need ${policy.rules.annual_split_gap_days} full days between them.`}
                {(form.leaveType === "casual" || form.leaveType === "other") &&
                  `Maximum ${policy.rules.casual_max_consecutive} consecutive days, and ${policy.rules.casual_gap_working_days} worked days between blocks. Cannot run directly into Annual Leave.`}
                {form.leaveType === "sick" && "Counted in working days. Cannot run directly into Annual Leave."}
                {form.leaveType === "marriage" &&
                  "15 paid calendar days, once per employment. Any extra days should be submitted as Unpaid Leave."}
                {form.leaveType === "unpaid" && "No limit — used for time off beyond your paid entitlement."}
              </p>
            )}
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
              <p className="text-[11px] text-[var(--ink-tertiary)] mt-1.5">Filed against your Casual Leave balance.</p>
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
