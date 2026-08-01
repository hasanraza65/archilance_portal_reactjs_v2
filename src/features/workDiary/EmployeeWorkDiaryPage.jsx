import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SearchSelect from "@/components/ui/SearchSelect";
import PageHeader from "@/components/layout/PageHeader";
import Menu from "@/components/ui/Menu";
import IconButton from "@/components/ui/IconButton";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useEmployeeWorkSessionsQuery } from "./useWorkDiaryData";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import StatTiles from "./components/StatTiles";
import AppUsageChart from "./components/AppUsageChart";
import SessionDayGroups from "./components/SessionDayGroups";
import DiaryFilterBar from "./components/DiaryFilterBar";
import { aggregateWindowsActivity } from "@/lib/productivity";
import { DEFAULT_RANGE_KEY, resolveRange, rangeLabel } from "./dateRanges";
import { exportWorkDiaryPdf } from "./exportPdf";
import { getMediaUrl } from "@/api/media";
import { toast } from "@/lib/toast";

const EmployeeWorkDiaryPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { data: employees = [] } = useAllEmployees();

  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  const [customRange, setCustomRange] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  const [startDate, endDate] = resolveRange(rangeKey, customRange);

  const { sessions, overallTotalSeconds, windowsActivity, isLoading } = useEmployeeWorkSessionsQuery(
    employeeId,
    { startDate, endDate, projectId: jobId, taskId }
  );

  const agg = useMemo(
    () => aggregateWindowsActivity(windowsActivity, overallTotalSeconds),
    [windowsActivity, overallTotalSeconds]
  );
  const idleSeconds = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.idle_seconds || 0), 0),
    [sessions]
  );

  const employee = employees.find((e) => String(e.id) === String(employeeId));
  const options = employees.map((e) => ({ value: e.id, label: e.name, sublabel: e.email }));

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);
    try {
      const result = await exportWorkDiaryPdf({
        heading: "Work Diary",
        meta: [
          ["Employee", employee?.name],
          ["Email", employee?.email],
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
        // Matches the gallery below, which renders this page with isAdminView
        // set: this route is management-only and always shows the admin copy of
        // a screenshot, so the PDF must read the same field.
        isAdminView: true,
        fileName: `work-diary-${employee?.name?.replace(/\s+/g, "-").toLowerCase() || employeeId}-${startDate}.pdf`,
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

  const exportLabel = progress?.total
    ? `Exporting ${Math.round((progress.loaded / progress.total) * 100)}%`
    : exporting
      ? "Exporting…"
      : "Export PDF";

  return (
    <div className="pb-10">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <Avatar name={employee?.name} src={employee?.profile_pic ? getMediaUrl(employee.profile_pic) : null} size="sm" />
            {employee?.name || "Employee"}'s Diary
          </span>
        }
        subtitle={rangeLabel(rangeKey, customRange)}
        actions={
          <div className="flex items-center gap-2">
            <div className="w-56 hidden sm:block">
              <SearchSelect
                options={options}
                value={employeeId}
                onChange={(v) => v && navigate(`/work-diary/${v}`)}
                placeholder="Switch employee…"
                searchPlaceholder="Search employees…"
              />
            </div>
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

      {/* The employee switcher needs full width on a phone, so it moves out of
          the header rather than being squeezed to a 56-unit stub beside it. */}
      <div className="sm:hidden px-4 mt-3">
        <SearchSelect
          options={options}
          value={employeeId}
          onChange={(v) => v && navigate(`/work-diary/${v}`)}
          placeholder="Switch employee…"
          searchPlaceholder="Search employees…"
          size="lg"
        />
      </div>

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
              <SessionDayGroups sessions={sessions} isAdminView />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkDiaryPage;
