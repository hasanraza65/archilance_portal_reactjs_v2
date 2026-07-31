import React, { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import { ScoreBar, scoreTone } from "./ScoreBar";
import { RATING_FIELDS, ratingAverage } from "@/api/internee";
import { getMediaUrl } from "@/api/media";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * One grading row. `showInternee` is off on an internee's own page (it's always
 * them) and on for managers looking across their interns.
 */
const RatingCard = ({ row, showInternee = true, onEdit }) => {
  const [open, setOpen] = useState(false);
  const avg = ratingAverage(row);
  const tone = scoreTone(avg);
  const didNotWork = Boolean(row.did_not_work);

  const person = showInternee ? row.internee : row.manager;
  const personLabel = showInternee ? null : "Graded by";

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-sunken)] transition-colors"
      >
        {person && (
          <Avatar name={person.name} src={person.profile_pic ? getMediaUrl(person.profile_pic) : null} size="md" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {person && (
              <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                {personLabel && <span className="text-[var(--ink-tertiary)] font-normal">{personLabel} </span>}
                {person.name}
              </span>
            )}
            {didNotWork ? (
              <Badge tone="danger">Did not work</Badge>
            ) : (
              <Badge tone="neutral">{avg.toFixed(1)} / 5</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--ink-tertiary)] mt-0.5 truncate">
            {row.task?.project?.project_name && (
              <>
                {row.task.project.project_name}
                <span className="mx-1">·</span>
              </>
            )}
            {row.task?.task_title || "Task removed"}
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 flex-none w-28">
          <span className={cn("text-xs font-semibold", didNotWork ? "text-red-500" : tone.text)}>
            {didNotWork ? "0.0" : avg.toFixed(1)}
          </span>
          <ScoreBar value={didNotWork ? 0 : avg} className="w-full" />
        </div>

        <div className="flex items-center gap-1 flex-none">
          <span className="text-[11px] text-[var(--ink-tertiary)] hidden sm:inline">{formatDate(row.rating_date)}</span>
          <Icon
            icon="solar:alt-arrow-right-bold"
            className={cn("text-[12px] text-[var(--ink-tertiary)] transition-transform", open && "rotate-90")}
          />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[var(--line-subtle)] pt-3">
          <p className="text-[11px] text-[var(--ink-tertiary)] sm:hidden mb-2">{formatDate(row.rating_date)}</p>

          {didNotWork ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3.5 py-3">
              <Icon icon="solar:danger-triangle-bold" className="text-[15px] text-red-500 mt-0.5 flex-none" />
              <p className="text-xs text-red-700 dark:text-red-400">
                No work was logged on this day, so it counts as <strong>0</strong> against the average.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
              {RATING_FIELDS.map((f) => {
                const v = Number(row[f.key]) || 0;
                const t = scoreTone(v);
                return (
                  <div key={f.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-[var(--ink-secondary)] truncate">{f.label}</span>
                      <span className={cn("text-xs font-bold flex-none", t.text)}>{v}/5</span>
                    </div>
                    <ScoreBar value={v} className="mt-1" />
                  </div>
                );
              })}
            </div>
          )}

          {row.comments && (
            <div className="mt-3 rounded-xl bg-[var(--surface-sunken)] px-3.5 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)] mb-1">Comments</p>
              <p className="text-xs text-[var(--ink-secondary)] whitespace-pre-wrap">{row.comments}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-3">
            {row.task?.project_id ? (
              <Link
                to={`/jobs/${row.task.project_id}`}
                className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Icon icon="solar:folder-bold-duotone" className="text-[12px]" />
                Open job
              </Link>
            ) : <span />}
            {onEdit && (
              <IconButton icon="solar:pen-linear" size="sm" label="Edit grade" onClick={() => onEdit(row)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingCard;
