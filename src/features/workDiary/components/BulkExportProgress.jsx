import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { formatDuration } from "@/lib/format";
import { ROW_STATUS, formatEta } from "../bulkExport";
import { cn } from "@/lib/cn";

/**
 * Live progress for a bulk export.
 *
 * A bulk run is long enough that a spinner is not an acceptable answer — the
 * user needs to know it is moving, roughly how much longer, and that nobody has
 * been quietly dropped. So this shows three things at once: an overall bar with
 * a percentage and an ETA, the person currently being rendered (with their own
 * screenshot sub-progress, which is where the time actually goes), and the full
 * per-person outcome list that survives after the run finishes.
 */

const STATUS_META = {
  [ROW_STATUS.PENDING]: { icon: "solar:clock-circle-linear", tone: "text-[var(--ink-tertiary)]", label: "Waiting" },
  [ROW_STATUS.WORKING]: { icon: "svg-spinners:180-ring", tone: "text-primary-500", label: "Building…" },
  [ROW_STATUS.DONE]: { icon: "solar:check-circle-bold", tone: "text-emerald-500", label: "Exported" },
  [ROW_STATUS.EMPTY]: { icon: "solar:close-circle-linear", tone: "text-[var(--ink-tertiary)]", label: "No activity" },
  [ROW_STATUS.FAILED]: { icon: "solar:danger-triangle-bold", tone: "text-red-500", label: "Failed" },
};

/* ------------------------------- the strip ------------------------------- */

export const BulkProgressStrip = ({ state, onCancel, zipping }) => {
  if (!state) return null;
  const { percent, etaSeconds, elapsedSeconds, currentIndex, total, current, shotsLoaded, shotsPlanned, zip } = state;
  const eta = formatEta(etaSeconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary-500/25 bg-[var(--surface-raised)] overflow-hidden shadow-soft"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl font-bold tabular-nums text-[var(--ink-primary)]">
                {zipping ? 100 : percent}%
              </span>
              <span className="text-sm text-[var(--ink-secondary)]">
                {zipping
                  ? "Packaging the ZIP…"
                  : `Diary ${Math.min(currentIndex + 1, total)} of ${total}`}
              </span>
            </div>

            <p className="text-xs text-[var(--ink-tertiary)] mt-1 truncate">
              {zipping ? (
                zip
                  ? `Adding file ${zip.done} of ${zip.total} — your download will start on its own.`
                  : "Almost done — your download will start on its own."
              ) : current ? (
                <>
                  <span className="text-[var(--ink-secondary)] font-medium">{current.name}</span>
                  {shotsPlanned > 0 && (
                    <> · {shotsLoaded} / {shotsPlanned} screenshots</>
                  )}
                </>
              ) : (
                "Starting…"
              )}
            </p>
          </div>

          {onCancel && !zipping && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="flex-none">
              Cancel
            </Button>
          )}
        </div>

        {/* Bar */}
        <div className="mt-3.5 h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-500"
            initial={{ width: 0 }}
            animate={{ width: `${zipping ? 100 : percent}%` }}
            transition={{ ease: "easeOut", duration: 0.35 }}
          />
        </div>

        <div className="flex items-center gap-4 mt-2.5 text-[11px] text-[var(--ink-tertiary)]">
          <span className="flex items-center gap-1.5">
            <Icon icon="solar:stopwatch-bold-duotone" className="text-[13px]" />
            {formatDuration(elapsedSeconds)} elapsed
          </span>
          {eta && !zipping && (
            <span className="flex items-center gap-1.5">
              <Icon icon="solar:hourglass-bold-duotone" className="text-[13px]" />
              about {eta} left
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ----------------------------- the row list ------------------------------ */

export const BulkResultList = ({ rows }) => {
  if (!rows?.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="max-h-[380px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const meta = STATUS_META[row.status] || STATUS_META[ROW_STATUS.PENDING];
            return (
              <motion.div
                key={row.id}
                layout
                className="flex items-center gap-3 px-3 h-[54px] border-b border-[var(--line-subtle)] last:border-b-0"
              >
                <Avatar name={row.name} size="sm" className="flex-none" />

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--ink-primary)] truncate">
                    {row.name}
                  </span>
                  <span className="block text-xs text-[var(--ink-tertiary)] truncate">
                    {row.status === ROW_STATUS.FAILED
                      ? row.error
                      : row.sessionCount > 0
                        ? `${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"} · ${formatDuration(row.workedSeconds)} worked · ${formatDuration(row.idleSeconds)} idle`
                        : meta.label}
                  </span>
                </span>

                <span className={cn("flex items-center gap-1.5 flex-none text-xs font-medium", meta.tone)}>
                  <Icon icon={meta.icon} className="text-[15px]" />
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
