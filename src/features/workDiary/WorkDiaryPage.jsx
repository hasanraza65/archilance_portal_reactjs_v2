import React, { useMemo, useRef, useState } from "react";
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
import { exportNodeToPdf } from "./exportPdf";
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
  const exportRef = useRef(null);

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
    try {
      await exportNodeToPdf(
        exportRef.current,
        `work-diary-${user?.name?.replace(/\s+/g, "-").toLowerCase() || "me"}-${startDate}.pdf`
      );
      toast.success("PDF exported.");
    } catch (err) {
      toast.error(err?.message || "Couldn't export the PDF.");
    } finally {
      setExporting(false);
    }
  };

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
              disabled={sessions.length === 0}
            >
              Export PDF
            </Button>
          </div>
        }
        mobileActions={
          <Menu
            trigger={<IconButton icon="solar:menu-dots-bold" label="Diary actions" />}
            items={[
              { label: "Manual time", icon: "solar:add-circle-linear", onClick: () => setManualOpen(true) },
              {
                label: exporting ? "Exporting…" : "Export PDF",
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

        {/* Everything inside this ref is what lands in the PDF. */}
        <div ref={exportRef} className="space-y-5 bg-[var(--surface-app)]">
          <div className="hidden print:block" />
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
