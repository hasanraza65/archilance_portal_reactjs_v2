import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import StatTiles from "./components/StatTiles";
import AppUsageChart from "./components/AppUsageChart";
import SessionDayGroups from "./components/SessionDayGroups";
import { DEFAULT_RANGE_KEY, resolveRange, rangeLabel, RANGE_PRESETS } from "./dateRanges";
import DateField from "@/components/ui/DateField";
import { useMyWorkSessions, idleSecondsForSession } from "./useWorkDiaryData";
import { aggregateWindowsActivity } from "@/lib/productivity";
import { useJobDetail } from "@/features/jobs/useJobsData";
import { useAuth } from "@/auth/AuthContext";
import { exportWorkDiaryPdf } from "./exportPdf";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

/**
 * Hours logged against ONE job, for the customer who owns it.
 *
 * The customer's own `/api/customer/work-session` endpoint is already scoped to
 * their data server-side, so passing `project_id` is all that's needed — this is
 * the same call the employee diary makes, just filtered to a job.
 *
 * Read-only by design: a customer can see the time spent and the screenshots,
 * but never delete a session or a screenshot.
 */
const JobWorkDiaryPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  const [customRange, setCustomRange] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  const [startDate, endDate] = resolveRange(rangeKey, customRange);

  const { data: job } = useJobDetail(projectId);
  const { sessions, overallTotalSeconds, windowsActivity, isLoading } = useMyWorkSessions({
    startDate,
    endDate,
    projectId,
  });

  const agg = useMemo(
    () => aggregateWindowsActivity(windowsActivity, overallTotalSeconds),
    [windowsActivity, overallTotalSeconds]
  );
  const idleSeconds = useMemo(() => sessions.reduce((sum, s) => sum + idleSecondsForSession(s), 0), [sessions]);

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);
    try {
      const slug = (job?.project_name || "job").replace(/\s+/g, "-").toLowerCase();
      const result = await exportWorkDiaryPdf({
        heading: "Work Diary",
        meta: [
          ["Job", job?.project_name],
          ["Customer", job?.customer?.name],
          ["Period", rangeLabel(rangeKey, customRange)],
        ],
        stats: {
          workedSeconds: overallTotalSeconds,
          idleSeconds,
          productiveSeconds: agg.productiveSeconds,
          productivePercent: agg.productivePercent,
        },
        apps: agg.apps,
        sessions,
        fileName: `work-diary-${slug}-${startDate}.pdf`,
        onProgress: (loaded, total) => setProgress(total ? { loaded, total } : null),
      });
      toast.success(
        result.screenshotsOmitted > 0
          ? `PDF exported — ${result.screenshotsIncluded} screenshots included, ${result.screenshotsOmitted} omitted.`
          : "PDF exported."
      );
    } catch (err) {
      toast.error(err?.message || "Couldn't build the PDF.");
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  const exportLabel = progress?.total
    ? `Exporting ${Math.round((progress.loaded / progress.total) * 100)}%`
    : exporting
      ? "Exporting…"
      : "Export PDF";

  return (
    <div className="pb-10">
      <PageHeader
        title={job?.project_name ? `${job.project_name} — Work Diary` : "Work Diary"}
        subtitle={`Time logged by the team on this job · ${rangeLabel(rangeKey, customRange)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="solar:arrow-left-linear" onClick={() => navigate(`/jobs/${projectId}`)}>
              Back to job
            </Button>
            <Button
              variant="secondary"
              icon="solar:document-text-linear"
              isLoading={exporting}
              onClick={handleExport}
              disabled={sessions.length === 0 || exporting}
            >
              {exportLabel}
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setRangeKey(p.key); if (p.key !== "custom") setCustomRange(null); }}
              className={cn(
                "px-3 h-8 rounded-lg text-xs font-medium border transition-colors",
                rangeKey === p.key
                  ? "border-primary-400 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                  : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)]"
              )}
            >
              {p.label}
            </button>
          ))}
          {rangeKey === "custom" && (
            <div className="flex items-center gap-2">
              <div className="w-40">
                <DateField
                  value={customRange?.start || null}
                  onChange={(d) => setCustomRange((r) => ({ ...r, start: d }))}
                  placeholder="From"
                />
              </div>
              <div className="w-40">
                <DateField
                  value={customRange?.end || null}
                  onChange={(d) => setCustomRange((r) => ({ ...r, end: d }))}
                  placeholder="To"
                  align="right"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 bg-[var(--surface-app)]">
          <StatTiles
            workedSeconds={overallTotalSeconds}
            idleSeconds={idleSeconds}
            productiveSeconds={agg.productiveSeconds}
            productivePercent={agg.productivePercent}
          />

          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--ink-primary)]">App Usage</p>
              <span className="text-xs text-[var(--ink-tertiary)]">{rangeLabel(rangeKey, customRange)}</span>
            </div>
            <AppUsageChart apps={agg.apps} categoryTotals={agg.categoryTotals} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)] mb-3">
              Sessions{" "}
              {sessions.length > 0 && (
                <span className="text-[var(--ink-tertiary)] font-normal">({sessions.length})</span>
              )}
            </p>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon="solar:clock-circle-linear"
                title="No time logged in this range"
                description="Try a wider date range — work on this job may have happened earlier."
              />
            ) : (
              /* No delete handlers: this view is read-only for customers. */
              <SessionDayGroups sessions={sessions} />
            )}
          </div>
        </div>

        {user?.role === "customer" && (
          <p className="flex items-start gap-1.5 text-[11px] text-[var(--ink-tertiary)]">
            <Icon icon="solar:shield-user-linear" className="text-[12px] mt-0.5 flex-none" />
            Times shown are net of idle periods, matching what's billed.
          </p>
        )}
      </div>
    </div>
  );
};

export default JobWorkDiaryPage;
