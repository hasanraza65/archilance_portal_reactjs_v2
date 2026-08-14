import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Badge from "@/components/ui/Badge";
import SessionTimelineBar from "./SessionTimelineBar";
import ScreenshotGallery from "./ScreenshotGallery";
import ActivityLogPanel from "./ActivityLogPanel";
import { sessionWorkedSeconds, idleSecondsForSession } from "../useWorkDiaryData";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

const SessionCard = ({ session, isAdminView = false, onDelete, onDeleteScreenshot, onViewDeletedShots }) => {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("screenshots");
  const worked = sessionWorkedSeconds(session);
  const idle = idleSecondsForSession(session);
  const isRunning = !session.end_date && !session.end_time;

  const start = new Date(`${session.start_date}T${session.start_time}`);
  const end = isRunning ? null : new Date(`${session.end_date}T${session.end_time}`);
  const hhmm = (d) =>
    d && Number.isFinite(d.getTime())
      ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : null;
  const timeLabel = hhmm(start);
  const endLabel = hhmm(end);

  // Date ranges can span many days, so every session states its own date -
  // times alone are ambiguous once the filter covers more than today. The year
  // only appears when it isn't the current one, to keep the line short.
  const dayOf = (d) => {
    if (!d || !Number.isFinite(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
    });
  };
  const startDayLabel = dayOf(start);
  // Sessions can run past midnight; only then does the end need its own date.
  const endedNextDay =
    end && session.end_date && session.start_date && session.end_date !== session.start_date;
  const endDayLabel = endedNextDay ? dayOf(end) : null;

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-3 sm:p-4">
      {/* On mobile the whole row toggles — a 32px chevron is a poor target when
          the card it opens is the size of the screen. */}
      <div
        className="flex items-start gap-3 sm:cursor-default cursor-pointer"
        onClick={(e) => { if (window.innerWidth < 640 && !e.target.closest("button")) setExpanded((v) => !v); }}
      >
        <span className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-none">
          <Icon icon={session.type === "Manual" ? "solar:pen-linear" : "solar:play-circle-bold"} className="text-[17px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--ink-primary)] break-words">{session.task_detail?.task_title || "Untitled task"}</span>
            {isRunning && <Badge tone="success" dot>Live</Badge>}
            {session.type === "Manual" && <Badge tone="info">Manual</Badge>}
          </div>
          <p className="text-xs text-[var(--ink-tertiary)] mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[var(--ink-secondary)] font-medium">{startDayLabel}</span>
            <span aria-hidden>·</span>
            <span>
              {timeLabel}
              {endLabel ? (
                <>
                  <span className="mx-1 text-[var(--ink-tertiary)]">→</span>
                  {endDayLabel && <span className="mr-1 text-[var(--ink-secondary)] font-medium">{endDayLabel},</span>}
                  {endLabel}
                </>
              ) : (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">→ running</span>
              )}
            </span>
            <span aria-hidden>·</span>
            <span>Worked <b className="text-[var(--ink-secondary)] font-semibold">{formatDuration(worked)}</b></span>
            {idle > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>Idle {formatDuration(idle)}</span>
              </>
            )}
          </p>
          <div className="mt-2.5"><SessionTimelineBar session={session} /></div>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {isAdminView && onViewDeletedShots && (
            <IconButton icon="solar:gallery-remove-bold" size="sm" onClick={() => onViewDeletedShots(session.id)} label="Deleted shots" />
          )}
          <IconButton icon={expanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} size="sm" onClick={() => setExpanded((e) => !e)} label="Details" />
          {onDelete && <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" onClick={() => onDelete(session.id)} label="Delete session" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-[var(--line-subtle)] space-y-3">
              {session.memo_content && <p className="text-xs text-[var(--ink-secondary)] italic">"{session.memo_content}"</p>}

              <div className="flex gap-1 border-b border-[var(--line-subtle)]">
                {[
                  { key: "screenshots", label: "Screenshots", short: "Shots", icon: "solar:camera-bold", count: session.screenshots?.length || 0 },
                  { key: "activity", label: "Activity", short: "Activity", icon: "solar:pulse-bold-duotone" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                      tab === t.key
                        ? "border-primary-500 text-primary-600 dark:text-primary-400"
                        : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    )}
                  >
                    <Icon icon={t.icon} className="text-[13px]" />
                    {/* "Screenshots" + a count won't sit beside "Activity" on a
                        narrow phone, so the label shortens below sm. */}
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.short}</span>
                    {t.count > 0 && <span className="text-[10px] text-[var(--ink-tertiary)]">{t.count}</span>}
                  </button>
                ))}
              </div>

              {tab === "screenshots" ? (
                session.screenshots?.length > 0 ? (
                  <ScreenshotGallery
                    screenshots={session.screenshots}
                    isAdminView={isAdminView}
                    onDelete={onDeleteScreenshot ? (id) => onDeleteScreenshot(id) : undefined}
                  />
                ) : (
                  <p className="text-xs text-[var(--ink-tertiary)] py-3">No screenshots for this session.</p>
                )
              ) : (
                <ActivityLogPanel sessionId={session.id} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionCard;
