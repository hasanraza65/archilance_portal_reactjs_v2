import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { fetchActivityLogs } from "@/api/workSessions";
import { useAuth } from "@/auth/AuthContext";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

const secondsBetween = (a, b) => {
  const s = new Date(a).getTime();
  const e = new Date(b).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.round((e - s) / 1000);
};

const timeOf = (v) =>
  new Date(v).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const clickLevel = (total) => {
  if (total > 50) return { label: "High", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" };
  if (total > 0) return { label: "Med", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" };
  return { label: "None", cls: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
};

/**
 * Per-session activity breakdown: a proportional active/idle timeline, summary
 * stats, and the full 30-second bucket log. Fetched lazily — only when a
 * session's Activity tab is actually opened.
 */
const ActivityLogPanel = ({ sessionId }) => {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", user?.role, sessionId],
    queryFn: () => fetchActivityLogs(user.role, sessionId),
    enabled: Boolean(sessionId) && Boolean(user),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    let total = 0, idle = 0, keys = 0, mouse = 0;
    for (const l of logs) {
      const d = secondsBetween(l.start_time, l.end_time);
      total += d;
      if (l.is_idle) idle += d;
      keys += Number(l.keyboard_clicks || 0);
      mouse += Number(l.mouse_clicks || 0);
    }
    const active = Math.max(0, total - idle);
    return {
      total, idle, active, keys, mouse,
      activityPct: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [logs]);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (logs.length === 0) {
    return <p className="text-xs text-[var(--ink-tertiary)] py-4 text-center">No activity logs recorded for this session.</p>;
  }

  const visible = showAll ? logs : logs.slice(0, 15);
  const shown = hovered || null;

  return (
    <div className="space-y-4">
      {/* Proportional timeline */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">Activity timeline</span>
          <span className="flex items-center gap-3 text-[10px] text-[var(--ink-tertiary)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Idle</span>
          </span>
        </div>
        <div className="flex h-7 rounded-lg overflow-hidden bg-[var(--surface-sunken)]" onMouseLeave={() => setHovered(null)}>
          {logs.map((l) => {
            const d = secondsBetween(l.start_time, l.end_time);
            const pct = stats.total > 0 ? (d / stats.total) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <button
                key={l.id}
                onMouseEnter={() => setHovered({ ...l, durationSec: d })}
                className={cn("h-full transition-opacity hover:opacity-70", l.is_idle ? "bg-amber-400" : "bg-emerald-500")}
                style={{ width: `${pct}%` }}
                title={`${timeOf(l.start_time)} · ${l.is_idle ? "Idle" : "Active"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Summary — swaps to the hovered segment's detail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          shown
            ? { label: "Segment", value: `${timeOf(shown.start_time)} – ${timeOf(shown.end_time)}`, icon: "solar:clock-circle-linear" }
            : { label: "Tracked", value: formatDuration(stats.total), icon: "solar:clock-circle-linear" },
          shown
            ? { label: "Duration", value: formatDuration(shown.durationSec), icon: "solar:stopwatch-bold-duotone" }
            : { label: "Active", value: formatDuration(stats.active), icon: "solar:pulse-bold-duotone" },
          shown
            ? { label: "State", value: shown.is_idle ? "Idle" : "Active", icon: "solar:pulse-bold-duotone" }
            : { label: "Activity", value: `${stats.activityPct}%`, icon: "solar:speedometer-max-bold-duotone" },
          shown
            ? { label: "Keys / Mouse", value: `${shown.keyboard_clicks ?? 0} / ${shown.mouse_clicks ?? 0}`, icon: "solar:keyboard-bold-duotone" }
            : { label: "Keys / Mouse", value: `${stats.keys} / ${stats.mouse}`, icon: "solar:keyboard-bold-duotone" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
              <Icon icon={s.icon} className="text-[11px]" /> {s.label}
            </span>
            <p className="text-sm font-bold text-[var(--ink-primary)] mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Detailed log table */}
      <div className="rounded-xl border border-[var(--line-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-[var(--surface-sunken)]">
              <tr>
                {["Time", "Status", "Application / Window", "Duration", "Keys", "Mouse", "Level"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[10px] text-[var(--ink-tertiary)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-subtle)]">
              {visible.map((l) => {
                const d = secondsBetween(l.start_time, l.end_time);
                const totalClicks = Number(l.keyboard_clicks || 0) + Number(l.mouse_clicks || 0);
                const lvl = clickLevel(totalClicks);
                return (
                  <tr key={l.id} className="hover:bg-[var(--surface-sunken)] transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--ink-secondary)]">{timeOf(l.start_time)}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                        l.is_idle ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", l.is_idle ? "bg-amber-500" : "bg-emerald-500")} />
                        {l.is_idle ? "Idle" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[260px]">
                      <span className="block truncate text-[var(--ink-primary)]" title={l.active_window_title || ""}>
                        {l.active_window_title || <span className="text-[var(--ink-tertiary)] italic">Screen idle / locked</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--ink-secondary)]">{formatDuration(d)}</td>
                    <td className="px-3 py-2 text-[var(--ink-secondary)]">{l.keyboard_clicks ?? 0}</td>
                    <td className="px-3 py-2 text-[var(--ink-secondary)]">{l.mouse_clicks ?? 0}</td>
                    <td className="px-3 py-2">
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold", lvl.cls)}>{lvl.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {logs.length > 15 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="w-full py-2 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:bg-[var(--surface-sunken)] border-t border-[var(--line-subtle)] transition-colors"
          >
            {showAll ? "Show less" : `Show all ${logs.length} entries`}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
