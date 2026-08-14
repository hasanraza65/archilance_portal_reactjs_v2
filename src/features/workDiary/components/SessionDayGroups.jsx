import React, { useMemo } from "react";
import Icon from "@/components/ui/Icon";
import SessionCard from "./SessionCard";
import { sessionWorkedSeconds } from "../useWorkDiaryData";
import { formatDuration } from "@/lib/format";

/**
 * Sessions grouped under a date header, with that day's total.
 *
 * Once a filter covers more than one day a flat list is genuinely hard to read
 * — you can't tell where one day ends and the next begins, and there's no way
 * to see how long any single day was. Headers only appear when the result
 * actually spans multiple days; for a single day the list renders exactly as
 * before, since a header repeating the filter you just set is just noise.
 */

const dayHeading = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const same = (a, b) => a.toDateString() === b.toDateString();
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });

  if (same(d, today)) return `Today · ${date}`;
  if (same(d, yesterday)) return `Yesterday · ${date}`;
  return `${weekday} · ${date}`;
};

const SessionDayGroups = ({ sessions = [], onDelete, onDeleteScreenshot, onViewDeletedShots, isAdminView = false }) => {
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const key = s.start_date || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    // Newest day first, matching the order sessions already arrive in.
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [sessions]);

  if (groups.length <= 1) {
    return (
      <div className="space-y-3">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            isAdminView={isAdminView}
            onDelete={onDelete}
            onDeleteScreenshot={onDeleteScreenshot}
            onViewDeletedShots={onViewDeletedShots}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([day, rows]) => {
        const total = rows.reduce((sum, s) => sum + sessionWorkedSeconds(s), 0);
        return (
          <div key={day}>
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <Icon icon="solar:calendar-linear" className="text-[13px] text-[var(--ink-tertiary)] flex-none" />
              <span className="text-[13px] font-semibold text-[var(--ink-primary)]">{dayHeading(day)}</span>
              <span className="text-[11px] text-[var(--ink-tertiary)]">
                {rows.length} session{rows.length === 1 ? "" : "s"}
              </span>
              <span className="ml-auto text-[11px] font-semibold text-[var(--ink-secondary)] bg-[var(--surface-sunken)] rounded-full px-2 py-0.5 flex-none">
                {formatDuration(total)}
              </span>
            </div>
            <div className="space-y-3">
              {rows.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isAdminView={isAdminView}
                  onDelete={onDelete}
                  onDeleteScreenshot={onDeleteScreenshot}
                  onViewDeletedShots={onViewDeletedShots}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SessionDayGroups;
