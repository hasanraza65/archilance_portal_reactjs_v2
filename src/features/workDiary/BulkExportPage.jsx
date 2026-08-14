import React, { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import EmptyState from "@/components/ui/EmptyState";
import { useCompleteEmployeeRoster } from "@/features/employees/useEmployeesData";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { RANGE_PRESETS, resolveRange, rangeLabel } from "./dateRanges";
import { runBulkExport, SCREENSHOT_PRESETS, formatBytes } from "./bulkExport";
import BulkEmployeePicker, { defaultSelection } from "./components/BulkEmployeePicker";
import { BulkProgressStrip, BulkResultList } from "./components/BulkExportProgress";

/**
 * Bulk work-diary export — one PDF per employee, zipped.
 *
 * Everything runs in this tab (see bulkExport.js for why that is the right call
 * on this infrastructure), which has one consequence worth designing around:
 * closing or navigating away kills the run. So the page warns on unload while
 * exporting, keeps the cancel button reachable at all times, and never leaves
 * the user guessing whether it is still alive.
 */

const SectionTitle = ({ children, hint }) => (
  <div className="flex items-baseline justify-between mb-2.5">
    <p className="text-sm font-semibold text-[var(--ink-primary)]">{children}</p>
    {hint && <span className="text-xs text-[var(--ink-tertiary)]">{hint}</span>}
  </div>
);

const BulkExportPage = () => {
  const { user } = useAuth();
  const { data: employees = [], isLoading } = useCompleteEmployeeRoster();

  const [rangeKey, setRangeKey] = useState("month");
  const [customRange, setCustomRange] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [touchedSelection, setTouchedSelection] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState("balanced");
  const [skipEmpty, setSkipEmpty] = useState(true);

  const [progress, setProgress] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const tokenRef = useRef(null);

  const [startDate, endDate] = resolveRange(rangeKey, customRange);
  const periodLabel = rangeLabel(rangeKey, customRange);

  // Everyone active starts ticked. Re-seeded only until the user touches the
  // list, so an in-flight roster refetch can't undo their choices.
  useEffect(() => {
    if (!touchedSelection && employees.length > 0) {
      setSelectedIds(defaultSelection(employees));
    }
  }, [employees, touchedSelection]);

  // The run lives in this tab, so leaving mid-export loses it. Browsers ignore
  // custom text here and show their own wording — returnValue is what matters.
  useEffect(() => {
    if (!running) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running]);

  const selected = useMemo(
    () => employees.filter((e) => selectedIds.has(e.id)),
    [employees, selectedIds]
  );

  const handleSelectionChange = (next) => {
    setTouchedSelection(true);
    setSelectedIds(next);
  };

  const handleExport = async () => {
    if (selected.length === 0) return;

    const token = { cancelled: false };
    tokenRef.current = token;
    setRunning(true);
    setZipping(false);
    setSummary(null);
    setProgress(null);

    try {
      const result = await runBulkExport({
        role: user.role,
        employees: selected,
        startDate,
        endDate,
        periodLabel,
        screenshotMode,
        skipEmpty,
        token,
        onUpdate: (state) => {
          setProgress(state);
          // The last employee finishing flips the strip over to the ZIP phase,
          // which is CPU-bound and reports no progress of its own.
          if (state.currentIndex >= state.total && state.total > 0) setZipping(true);
        },
      });

      if (result.cancelled) {
        setSummary(result);
        if (result.files > 0) {
          toast("Stopped early", {
            description: `The ${result.exported} ${result.exported === 1 ? "diary" : "diaries"} already built were downloaded as a partial ZIP.`,
          });
        } else {
          toast("Export cancelled.", { description: "Nothing was downloaded." });
        }
      } else if (result.nothingToExport) {
        toast.error("Nothing to export", {
          description: "None of the selected people had sessions in this period.",
        });
        setSummary(result);
      } else {
        const parts = [`${result.exported} ${result.exported === 1 ? "diary" : "diaries"}`];
        if (result.skipped) parts.push(`${result.skipped} with no activity`);
        if (result.failed) parts.push(`${result.failed} failed`);
        toast.success(`ZIP downloaded — ${formatBytes(result.bytes)}`, {
          description: parts.join(" · "),
        });
        setSummary(result);
      }
    } catch (err) {
      toast.error("The export stopped", { description: err?.message || "Unknown error." });
    } finally {
      setRunning(false);
      setZipping(false);
      tokenRef.current = null;
    }
  };

  const handleCancel = () => {
    if (tokenRef.current) tokenRef.current.cancelled = true;
  };

  const isCustom = rangeKey === "custom";
  const rows = progress?.rows || summary?.rows || [];

  /* ------------------------------ options ------------------------------ */
  const optionsPanel = (
    <div className="space-y-5">
      <div>
        <SectionTitle hint={`${startDate} → ${endDate}`}>Period</SectionTitle>
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={running}
                onClick={() => setRangeKey(p.key)}
                className={cn(
                  "h-9 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                  rangeKey === p.key
                    ? "bg-primary-500 text-white"
                    : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-[var(--line-subtle)]">
            <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)] mb-2">
              Custom range
            </p>
            <div className="flex items-center gap-2">
              <DatePicker
                value={customRange?.[0] || ""}
                onChange={(d) => {
                  setCustomRange([d, customRange?.[1] || d]);
                  setRangeKey("custom");
                }}
                anchorClassName="flex flex-1 min-w-0"
                trigger={
                  <span
                    className={cn(
                      "flex-1 flex items-center gap-2 h-9.5 px-3 rounded-xl border text-xs cursor-pointer",
                      isCustom
                        ? "border-primary-400 bg-primary-500/5 text-[var(--ink-primary)]"
                        : "border-[var(--line-subtle)] bg-[var(--surface-app)] text-[var(--ink-secondary)]"
                    )}
                  >
                    <Icon icon="solar:calendar-linear" className="text-primary-500 text-[14px] flex-none" />
                    <span className="truncate">
                      {customRange?.[0] ? formatDate(customRange[0]) : "Start"}
                    </span>
                  </span>
                }
              />
              <span className="text-xs text-[var(--ink-tertiary)] flex-none">→</span>
              <DatePicker
                value={customRange?.[1] || ""}
                onChange={(d) => {
                  setCustomRange([customRange?.[0] || d, d]);
                  setRangeKey("custom");
                }}
                align="right"
                anchorClassName="flex flex-1 min-w-0"
                trigger={
                  <span
                    className={cn(
                      "flex-1 flex items-center gap-2 h-9.5 px-3 rounded-xl border text-xs cursor-pointer",
                      isCustom
                        ? "border-primary-400 bg-primary-500/5 text-[var(--ink-primary)]"
                        : "border-[var(--line-subtle)] bg-[var(--surface-app)] text-[var(--ink-secondary)]"
                    )}
                  >
                    <Icon icon="solar:calendar-linear" className="text-primary-500 text-[14px] flex-none" />
                    <span className="truncate">
                      {customRange?.[1] ? formatDate(customRange[1]) : "End"}
                    </span>
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle hint="affects size & speed">Screenshots</SectionTitle>
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-2 space-y-1">
          {Object.entries(SCREENSHOT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              disabled={running}
              onClick={() => setScreenshotMode(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 h-10 rounded-xl text-left transition-colors disabled:opacity-50",
                screenshotMode === key
                  ? "bg-primary-500/10 text-[var(--ink-primary)]"
                  : "hover:bg-[var(--surface-sunken)] text-[var(--ink-secondary)]"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full border-[5px] flex-none transition-colors",
                  screenshotMode === key
                    ? "border-primary-500 bg-[var(--surface-raised)]"
                    : "border-[var(--line-strong)] bg-transparent"
                )}
              />
              <span className="text-sm font-medium flex-1 truncate">{preset.label}</span>
              {Number.isFinite(preset.perSession) ? (
                preset.total > 0 && (
                  <span className="text-[11px] text-[var(--ink-tertiary)] flex-none">
                    max {preset.perSession}/session
                  </span>
                )
              ) : (
                <span className="text-[11px] text-[var(--ink-tertiary)] flex-none">no limit</span>
              )}
            </button>
          ))}
        </div>

        {SCREENSHOT_PRESETS[screenshotMode]?.warn ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/[0.08] p-2.5">
            <Icon icon="solar:danger-triangle-bold" className="text-amber-500 text-[15px] flex-none mt-px" />
            <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
              Every screenshot will be included, with nothing left out. Over a wide
              date range or a large team this can take considerably longer to
              generate and will produce a much larger ZIP file. Please leave this
              tab open until the download begins.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--ink-tertiary)] mt-2 leading-relaxed">
            Screenshots are the slowest part of an export. Choosing fewer makes the
            run faster and the ZIP much smaller — worked hours, idle time and app
            usage are always included in full.
          </p>
        )}
      </div>

      <div>
        <SectionTitle>Options</SectionTitle>
        <button
          type="button"
          disabled={running}
          onClick={() => setSkipEmpty((v) => !v)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-left disabled:opacity-50 hover:bg-[var(--surface-sunken)] transition-colors"
        >
          <span
            className={cn(
              "w-9 h-5 rounded-full flex-none relative transition-colors",
              skipEmpty ? "bg-primary-500" : "bg-[var(--line-strong)]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                skipEmpty ? "left-[18px]" : "left-0.5"
              )}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--ink-primary)]">
              Skip people with no activity
            </span>
            <span className="block text-xs text-[var(--ink-tertiary)]">
              They're still listed in summary.csv
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  /* ------------------------------- render ------------------------------- */
  return (
    <div className="pb-28 lg:pb-10">
      <PageHeader
        title="Bulk Diary Export"
        subtitle="One PDF per employee — worked hours, idle time, app usage and screenshots."
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        {(progress || summary) && (
          <div className="space-y-3">
            {running && (
              <BulkProgressStrip state={progress} onCancel={handleCancel} zipping={zipping} />
            )}

            {!running && summary && (
              <div
                className={cn(
                  "rounded-2xl border p-4 flex items-start gap-3",
                  summary.cancelled || summary.nothingToExport
                    ? "border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/[0.07]"
                    : "border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-500/[0.07]"
                )}
              >
                <Icon
                  icon={
                    summary.cancelled || summary.nothingToExport
                      ? "solar:danger-triangle-bold"
                      : "solar:check-circle-bold"
                  }
                  className={cn(
                    "text-xl flex-none mt-0.5",
                    summary.cancelled || summary.nothingToExport ? "text-amber-500" : "text-emerald-500"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink-primary)]">
                    {summary.nothingToExport
                      ? "No diaries to export"
                      : summary.cancelled
                        ? summary.files > 0
                          ? `Stopped early — ${summary.exported} of ${summary.rows.length} downloaded`
                          : "Cancelled before anything finished"
                        : `${summary.exported} ${summary.exported === 1 ? "diary" : "diaries"} downloaded`}
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                    {periodLabel}
                    {summary.bytes ? ` · ${formatBytes(summary.bytes)} ZIP` : ""}
                    {summary.skipped ? ` · ${summary.skipped} with no activity` : ""}
                    {summary.failed ? ` · ${summary.failed} failed` : ""}
                  </p>
                </div>
              </div>
            )}

            {rows.length > 0 && <BulkResultList rows={rows} />}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon="solar:users-group-rounded-bold-duotone"
            title="No employees found"
            description="There's nobody on the roster to export a diary for."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
            <div className="order-2 lg:order-1">{optionsPanel}</div>

            <div className="order-1 lg:order-2">
              <SectionTitle hint={`${selected.length} selected`}>Employees</SectionTitle>
              <BulkEmployeePicker
                employees={employees}
                selectedIds={selectedIds}
                onChange={handleSelectionChange}
                disabled={running}
              />

              {/* Desktop action row — the mobile one is the sticky bar below. */}
              <div className="hidden lg:flex items-center justify-between gap-3 mt-4">
                <p className="text-xs text-[var(--ink-tertiary)]">
                  Keep this tab open while the export runs.
                </p>
                <Button
                  size="lg"
                  icon="solar:download-minimalistic-bold"
                  onClick={handleExport}
                  isLoading={running}
                  disabled={running || selected.length === 0}
                >
                  {running
                    ? "Exporting…"
                    : `Export ${selected.length} ${selected.length === 1 ? "diary" : "diaries"}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile action bar — the button must never be scrolled away. */}
      {employees.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[var(--surface-raised)]/95 backdrop-blur border-t border-[var(--line-subtle)]">
          <div className="flex items-center gap-2">
            {running && (
              <Button variant="secondary" size="lg" onClick={handleCancel} className="flex-none">
                Cancel
              </Button>
            )}
            <Button
              size="lg"
              icon="solar:download-minimalistic-bold"
              onClick={handleExport}
              isLoading={running}
              disabled={running || selected.length === 0}
              className="flex-1"
            >
              {running
                ? `${progress?.percent ?? 0}%`
                : `Export ${selected.length} ${selected.length === 1 ? "diary" : "diaries"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkExportPage;
