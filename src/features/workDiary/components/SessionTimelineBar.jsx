import React, { useMemo } from "react";

/** A compact horizontal bar: session span in primary color, idle intervals overlaid in amber. */
const SessionTimelineBar = ({ session }) => {
  const { startMs, endMs, idleSegments } = useMemo(() => {
    const start = new Date(`${session.start_date}T${session.start_time}`).getTime();
    const end = session.end_date && session.end_time
      ? new Date(`${session.end_date}T${session.end_time}`).getTime()
      : Date.now();

    const segments = (session.idle_times || [])
      .map((i) => {
        const s = new Date(i.start_time).getTime();
        const e = new Date(i.end_time).getTime();
        return [s, e];
      })
      .filter(([s, e]) => e > s && s >= start && e <= end + 60_000);

    return { startMs: start, endMs: Math.max(end, start + 1000), idleSegments: segments };
  }, [session]);

  const span = endMs - startMs || 1;

  return (
    <div className="relative h-2 rounded-full bg-primary-500/25 overflow-hidden w-full">
      {idleSegments.map(([s, e], i) => {
        const left = Math.max(0, ((s - startMs) / span) * 100);
        const width = Math.max(0.6, ((e - s) / span) * 100);
        return (
          <div
            key={i}
            className="absolute top-0 h-full bg-amber-400"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}
    </div>
  );
};

export default SessionTimelineBar;
