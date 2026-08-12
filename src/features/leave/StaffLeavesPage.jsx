import React, { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import EmptyState from "@/components/ui/EmptyState";
import MobileFilterBar from "@/components/ui/MobileFilterBar";
import { useLeaveRequests, useUpdateLeaveStatus, useDeleteLeaveRequest } from "./useLeaveData";
import LeaveBalanceModal from "./LeaveBalanceModal";
import RecordLeaveModal from "./RecordLeaveModal";
import ReviewAudit from "./ReviewAudit";
import Button from "@/components/ui/Button";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import { useDebounce } from "@/hooks/useDebounce";
import { getMediaUrl } from "@/api/media";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const STATUS_TONE = { Pending: "warning", Approved: "success", Rejected: "danger" };
const FILTERS = ["All", "Pending", "Approved", "Rejected"];

const daysBetween = (start, end) => Math.round((new Date(end) - new Date(start)) / 86400000) + 1;

const StaffLeavesPage = () => {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [balanceTarget, setBalanceTarget] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // The leave API filters by user_id (csv), not by free text — so a name/email/
  // phone query is resolved against the employee roster first and sent as ids.
  // That keeps filtering SERVER-side and correct across every page, instead of
  // only matching whatever happens to be on the current page.
  const { data: employees = [] } = useAllEmployees();
  const matchedUserIds = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return null; // no search -> no user_id filter
    return employees
      .filter((e) =>
        [e.name, e.email, e.phone, e.username].some((v) => String(v || "").toLowerCase().includes(q))
      )
      .map((e) => e.id);
  }, [employees, debouncedSearch]);

  const noMatches = matchedUserIds !== null && matchedUserIds.length === 0;

  const { data, isLoading } = useLeaveRequests({
    page,
    perPage: 20,
    status: filter,
    userIds: matchedUserIds || undefined,
    enabled: !noMatches,
  });
  const updateStatus = useUpdateLeaveStatus();
  const deleteMut = useDeleteLeaveRequest("admin");

  const items = noMatches ? [] : data?.items || [];
  const counts = data?.counts || {};

  return (
    <div className="pb-10">
      <PageHeader
        title="Staff Leaves"
        subtitle={`${counts.total ?? 0} total · ${counts.pending ?? 0} pending`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email or phone…"
                className="pl-9 pr-3 h-9 w-64 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
            {/* Management exception route — record leave that the employee
                cannot file themselves (short-notice Annual Leave, etc.). */}
            <Button size="sm" icon="solar:calendar-add-bold" onClick={() => setRecordOpen(true)}>
              Record leave
            </Button>
          </div>
        }
        tabs={
          <div className="flex gap-1 -mb-px min-w-max">
            {FILTERS.map((f) => {
              // Counts on the tab itself: on mobile the summary line is the first
              // thing to get truncated, so the number needs to live on the control.
              const n = f === "All" ? counts.total : counts[f.toLowerCase()];
              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex-none",
                    filter === f ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  )}
                >
                  {f}
                  {typeof n === "number" && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      filter === f ? "bg-primary-500/15 text-primary-600 dark:text-primary-400" : "bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]"
                    )}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="px-4 sm:hidden mt-3">
        <MobileFilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search name, email or phone…"
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-4 sm:mt-5">
        {isLoading && !noMatches ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={debouncedSearch ? "solar:magnifer-linear" : "solar:calendar-mark-linear"}
            title={debouncedSearch ? "No matching employees" : "No leave requests"}
            description={
              debouncedSearch
                ? `Nobody matches "${debouncedSearch}". Try a different name, email or phone.`
                : filter !== "All"
                ? `No ${filter.toLowerCase()} requests.`
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button onClick={() => setBalanceTarget(r)} title="View leave balance">
                      <Avatar name={r.user?.name} src={r.user?.profile_pic ? getMediaUrl(r.user.profile_pic) : null} size="md" />
                    </button>
                    <div className="min-w-0 flex-1">
                      {/* Name on its own line on mobile so a long name doesn't shove
                          the status badge off the card. */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          onClick={() => setBalanceTarget(r)}
                          className="text-sm font-semibold text-[var(--ink-primary)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left truncate max-w-full"
                          title="View leave balance"
                        >
                          {r.user?.name || "Unknown"}
                        </button>
                        <Badge tone={STATUS_TONE[r.status] || "neutral"}>{r.status}</Badge>
                        <Badge tone="neutral" className="capitalize">{r.leave_type}</Badge>
                      </div>
                      <p className="text-xs text-[var(--ink-tertiary)] mt-1 truncate">{r.user?.email}</p>
                      <p className="text-xs text-[var(--ink-secondary)] mt-1.5 flex items-start gap-1.5">
                        <Icon icon="solar:calendar-linear" className="text-[12px] mt-0.5 flex-none" />
                        <span>
                          {formatDate(r.start_date)} to {formatDate(r.end_date)}
                          <span className="mx-1 text-[var(--ink-tertiary)]">·</span>
                          {daysBetween(r.start_date, r.end_date)} days
                        </span>
                      </p>
                      {r.reason && <p className="text-xs text-[var(--ink-secondary)] mt-1">{r.reason}</p>}
                      <ReviewAudit request={r} className="mt-2" />
                    </div>
                  </div>

                  {/* Actions: compact on desktop, full-width targets on mobile.
                      Approve/Reject are destructive-ish decisions — squeezing them
                      into 60px-wide buttons next to a delete icon invites mistakes. */}
                  <div className="flex items-center gap-1.5 flex-none w-full sm:w-auto mt-3 sm:mt-0">
                    {r.status === "Pending" ? (
                      <>
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "Approved" })}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-9 sm:h-auto px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                        >
                          <Icon icon="solar:check-circle-bold" className="text-[14px] sm:hidden" />
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "Rejected" })}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-9 sm:h-auto px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <Icon icon="solar:close-circle-bold" className="text-[14px] sm:hidden" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => updateStatus.mutate({ id: r.id, status: "Pending" })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] transition-colors"
                      >
                        <Icon icon="solar:restart-linear" className="text-[14px]" />
                        <span className="sm:hidden">Reset to pending</span>
                      </button>
                    )}
                    <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Delete" onClick={() => deleteMut.mutate(r.id)} className="flex-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.lastPage > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-[var(--ink-tertiary)]">Page {data.currentPage} of {data.lastPage}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
              <button disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <LeaveBalanceModal request={balanceTarget} onClose={() => setBalanceTarget(null)} />
      <RecordLeaveModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </div>
  );
};

export default StaffLeavesPage;
