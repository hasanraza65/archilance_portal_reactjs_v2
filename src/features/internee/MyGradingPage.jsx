import React, { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import { ScoreBar, scoreTone } from "./ScoreBar";
import RatingCard from "./RatingCard";
import { useInterneeRatings } from "./useInterneeData";
import { RATING_FIELDS, ratingAverage } from "@/api/internee";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * An internee's own grading history.
 *
 * The month-long lock is enforced server-side — when `eligibility.is_eligible`
 * is false the API returns an empty page no matter what we ask for, so this
 * page explains the wait rather than showing a misleading "no grades yet".
 */
const MyGradingPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInterneeRatings({ page });

  const rows = data?.items || [];
  const eligibility = data?.eligibility;
  const locked = eligibility?.applies && !eligibility.is_eligible;

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const scored = rows.filter((r) => !r.did_not_work);
    const avg = rows.reduce((sum, r) => sum + ratingAverage(r), 0) / rows.length;
    const perField = RATING_FIELDS.map((f) => {
      const vals = scored.map((r) => Number(r[f.key])).filter(Number.isFinite);
      return { ...f, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
    });
    return { avg, perField, missed: rows.length - scored.length, total: rows.length };
  }, [rows]);

  if (locked) {
    return (
      <div className="pb-10">
        <PageHeader maxWidth="max-w-xl" title="My Grading" subtitle="Your daily performance record." />
        <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-xl mx-auto">
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Icon icon="solar:hourglass-bold-duotone" className="text-[26px]" />
            </div>
            <h3 className="font-semibold text-[var(--ink-primary)]">Grading unlocks after your first month</h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-2">
              Your manager is already recording daily grades — you'll be able to see the full history
              {eligibility.available_from ? (
                <> from <strong className="text-[var(--ink-primary)]">{formatDate(eligibility.available_from)}</strong>.</>
              ) : (
                <> once a month has passed since you joined.</>
              )}
            </p>
            {eligibility.joining_date && (
              <p className="text-xs text-[var(--ink-tertiary)] mt-3">
                Joined {formatDate(eligibility.joining_date)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tone = summary ? scoreTone(summary.avg) : null;

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-3xl"
        title="My Grading"
        subtitle={
          isLoading
            ? "Loading…"
            : summary
            ? `${summary.total} graded day${summary.total === 1 ? "" : "s"} · ${summary.avg.toFixed(1)} average`
            : "Your daily performance record."
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="solar:medal-ribbons-star-bold-duotone"
            title="No grades yet"
            description="Once your manager starts grading your daily work, it'll show up here."
          />
        ) : (
          <>
            {/* Overall */}
            <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">Overall average</p>
                  <p className={cn("text-3xl font-bold", tone.text)}>{summary.avg.toFixed(1)}<span className="text-base text-[var(--ink-tertiary)] font-normal"> / 5</span></p>
                  <p className={cn("text-xs font-medium mt-0.5", tone.text)}>{tone.label}</p>
                </div>
                {summary.missed > 0 && (
                  <div className="ml-auto flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3 py-2">
                    <Icon icon="solar:danger-triangle-bold" className="text-[14px] text-red-500 mt-0.5 flex-none" />
                    <p className="text-[11px] text-red-700 dark:text-red-400 max-w-[15rem]">
                      <strong>{summary.missed}</strong> day{summary.missed === 1 ? "" : "s"} with no work logged —
                      each counts as 0 in this average.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 mt-5 pt-4 border-t border-[var(--line-subtle)]">
                {summary.perField.map((f) => (
                  <div key={f.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-[var(--ink-secondary)] truncate" title={f.hint}>{f.label}</span>
                      <span className={cn("text-xs font-bold flex-none", scoreTone(f.avg).text)}>{f.avg.toFixed(1)}</span>
                    </div>
                    <ScoreBar value={f.avg} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((r) => <RatingCard key={r.id} row={r} showInternee={false} />)}
            </div>

            {data?.lastPage > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--ink-tertiary)]">Page {data.currentPage} of {data.lastPage}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
                  <button disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyGradingPage;
