import React, { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Menu from "@/components/ui/Menu";
import IconButton from "@/components/ui/IconButton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { useMyWorkSessions, useDeleteWorkSession, useDeleteScreenshot } from "./useWorkDiaryData";
import StatTiles from "./components/StatTiles";
import AppUsageChart from "./components/AppUsageChart";
import SessionDayGroups from "./components/SessionDayGroups";
import DiaryFilterBar from "./components/DiaryFilterBar";
import ManualTimeModal from "./components/ManualTimeModal";
import { aggregateWindowsActivity } from "@/lib/productivity";
import { DEFAULT_RANGE_KEY, resolveRange, rangeLabel } from "./dateRanges";
import { exportWorkDiaryPdf } from "./exportPdf";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/lib/toast";

const WorkDiaryPage = () => {
  const { user } = useAuth();
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  const [customRange, setCustomRange] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  const [startDate, endDate] = resolveRange(rangeKey, customRange);

  const { sessions, overallTotalSeconds, windowsActivity, isLoading } = useMyWorkSessions({
    startDate, endDate, projectId: jobId, taskId,
  });
  const deleteSession = useDeleteWorkSession();
  const deleteScreenshot = useDeleteScreenshot();

  const agg = useMemo(
    () => aggregateWindowsActivity(windowsActivity, overallTotalSeconds),
    [windowsActivity, overallTotalSeconds]
  );
  const idleSeconds = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.idle_seconds || 0), 0),
    [sessions]
  );

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);
    try {
      const result = await exportWorkDiaryPdf({
        heading: "Work Diary",
        meta: [
          ["Employee", user?.name],
          ["Email", user?.email],
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
        fileName: `work-diary-${user?.name?.replace(/\s+/g, "-").toLowerCase() || "me"}-${startDate}.pdf`,
        onProgress: (loaded, total) => setProgress(total ? { loaded, total } : null),
      });
      toast.success(
        result.screenshotsOmitted > 0
          ? `PDF exported — ${result.screenshotsIncluded} screenshots included, ${result.screenshotsOmitted} omitted.`
          : "PDF exported."
      );
    } catch (err) {
      toast.error(err?.message || "Couldn't export the PDF.");
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  // A wide range downloads hundreds of screenshots, so a plain spinner looks
  // like it has hung. Show how far along it actually is.
  const exportLabel = progress?.total
    ? `Exporting ${Math.round((progress.loaded / progress.total) * 100)}%`
    : exporting
      ? "Exporting…"
      : "Export PDF";

  return (
    <div className="pb-10">
      <PageHeader
        title="Work Diary"
        subtitle="Your sessions, activity and screenshots — all in one place."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon="solar:add-circle-linear" onClick={() => setManualOpen(true)}>
              Manual time
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="solar:document-text-linear"
              isLoading={exporting}
              onClick={handleExport}
              disabled={sessions.length === 0 || exporting}
            >
              {exportLabel}
            </Button>
          </div>
        }
        mobileActions={
          <Menu
            trigger={<IconButton icon="solar:menu-dots-bold" label="Diary actions" />}
            items={[
              { label: "Manual time", icon: "solar:add-circle-linear", onClick: () => setManualOpen(true) },
              {
                label: exportLabel,
                icon: "solar:document-text-linear",
                disabled: sessions.length === 0 || exporting,
                onClick: handleExport,
              },
            ]}
          />
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        <DiaryFilterBar
          rangeKey={rangeKey}
          onRangeKey={setRangeKey}
          customRange={customRange}
          onCustomRange={setCustomRange}
          jobId={jobId}
          onJobId={setJobId}
          taskId={taskId}
          onTaskId={setTaskId}
        />

        {/* The PDF is built from the session data, not from this markup — see
            exportPdf.js for why. */}
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
              Sessions {sessions.length > 0 && <span className="text-[var(--ink-tertiary)] font-normal">({sessions.length})</span>}
            </p>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon="solar:clock-circle-linear"
                title="No sessions in this range"
                description="Try a different date range or clear the job/task filters."
              />
            ) : (
              <SessionDayGroups
                sessions={sessions}
                onDelete={(id) => deleteSession.mutate(id)}
                onDeleteScreenshot={(id) => deleteScreenshot.mutate(id)}
              />
            )}
          </div>
        </div>
      </div>

      <ManualTimeModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  );
};

export default WorkDiaryPage;
