import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import ReviewAudit from "./ReviewAudit";
import { fetchLeaveRequestDetail } from "@/api/leave";
import { useAuth } from "@/auth/AuthContext";
import { getMediaUrl } from "@/api/media";
import { formatDate } from "@/lib/format";
import { LEAVE_ENTITLEMENTS, serviceMonths, eligibilityNote, balanceTone } from "./leaveEntitlements";
import { cn } from "@/lib/cn";

/**
 * Per-employee leave balance, opened from a Staff Leaves row.
 * `leave_summary` (days used this cycle) comes from the request-detail endpoint;
 * the totals come from the entitlement rules.
 */
const LeaveBalanceModal = ({ request, onClose }) => {
  const { user: viewer } = useAuth();
  const open = Boolean(request);

  const { data, isLoading } = useQuery({
    queryKey: ["leave-detail", request?.id],
    queryFn: () => fetchLeaveRequestDetail(viewer.role, request.id),
    enabled: open,
  });

  const employee = request?.user;
  const months = serviceMonths(employee?.joining_date);
  const summary = data?.summary || {};
  const cycle = data?.cycle;

  // "other"/"additional" only appear when the backend actually reports them.
  const rows = LEAVE_ENTITLEMENTS.filter((e) => !e.optional || summary[e.key] !== undefined);

  return (
    <Modal open={open} onClose={onClose} title="Leave balance" className="max-w-lg">
      {!request ? null : (
        <div className="space-y-5">
          {/* Employee */}
          <div className="flex items-center gap-3">
            <Avatar name={employee?.name} src={employee?.profile_pic ? getMediaUrl(employee.profile_pic) : null} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--ink-primary)] truncate">{employee?.name}</span>
                {employee?.employee_type && <Badge tone="neutral">{employee.employee_type}</Badge>}
              </div>
              <p className="text-xs text-[var(--ink-tertiary)] truncate">{employee?.email}</p>
              <p className="text-[11px] text-[var(--ink-tertiary)] mt-0.5">
                {employee?.joining_date ? `Joined ${formatDate(employee.joining_date)}` : "Joining date not set"}
                {months !== null && ` · ${months} month${months === 1 ? "" : "s"} of service`}
              </p>
            </div>
          </div>

          {cycle && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-sunken)] text-xs text-[var(--ink-secondary)]">
              <Icon icon="solar:calendar-linear" className="text-[13px] text-primary-500" />
              Leave cycle: <strong className="text-[var(--ink-primary)]">{formatDate(cycle.start)} – {formatDate(cycle.end)}</strong>
            </div>
          )}

          {/* Balances */}
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rows.map((rule) => {
                const used = Number(summary[rule.key] || 0);
                const unlimited = rule.total === 0;
                const remaining = unlimited ? null : Math.max(0, rule.total - used);
                const pct = unlimited ? 0 : Math.min(100, (used / rule.total) * 100);
                const tone = unlimited ? null : balanceTone(remaining);
                const locked = eligibilityNote(rule.key, months);

                return (
                  <div key={rule.key} className="rounded-xl border border-[var(--line-subtle)] p-3.5">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--ink-primary)]">{rule.label}</span>
                      {unlimited ? (
                        <span className="text-[11px] text-[var(--ink-tertiary)]">No limit</span>
                      ) : (
                        <span className={cn("text-xs font-semibold", tone.text)}>{remaining} left</span>
                      )}
                    </div>

                    {unlimited ? (
                      <p className="text-lg font-bold text-[var(--ink-primary)]">{used} <span className="text-xs font-normal text-[var(--ink-tertiary)]">used</span></p>
                    ) : (
                      <>
                        <div className="h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className={cn("h-full rounded-full", tone.bar)}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--ink-tertiary)]">
                          <span>Used {used} of {rule.total}</span>
                          <span className={tone.text}>{tone.label}</span>
                        </div>
                      </>
                    )}

                    {locked && (
                      <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Icon icon="solar:danger-triangle-bold" className="text-[11px]" /> {locked}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* The request that was clicked */}
          <div className="rounded-xl bg-[var(--surface-sunken)] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mb-1.5">This request</p>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Badge tone="neutral" className="capitalize">{request.leave_type}</Badge>
              <span className="text-[var(--ink-secondary)]">{formatDate(request.start_date)} – {formatDate(request.end_date)}</span>
              <Badge tone={request.status === "Approved" ? "success" : request.status === "Rejected" ? "danger" : "warning"}>{request.status}</Badge>
            </div>
            {request.reason && <p className="text-xs text-[var(--ink-secondary)] mt-2">{request.reason}</p>}
            {/* Prefer the freshly-fetched row — it carries the reviewer relation. */}
            <ReviewAudit request={data?.request || request} className="mt-2.5" />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default LeaveBalanceModal;
