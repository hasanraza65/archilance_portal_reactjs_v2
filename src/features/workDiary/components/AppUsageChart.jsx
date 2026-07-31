import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

const CATEGORY_COLORS = { Productive: "#10b981", Social: "#ef4444", Neutral: "#94a3b8" };

const AppUsageChart = ({ apps = [], categoryTotals }) => {
  const pieData = Object.entries(categoryTotals || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const maxDuration = apps[0]?.duration || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
      <div className="h-44 relative">
        {pieData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatDuration(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--line-subtle)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-[var(--ink-tertiary)]">Tracked</span>
              <span className="text-sm font-bold text-[var(--ink-primary)]">
                {formatDuration(pieData.reduce((a, b) => a + b.value, 0))}
              </span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-[var(--ink-tertiary)]">No app data</div>
        )}
      </div>

      <div className="space-y-2.5">
        {apps.slice(0, 6).map((app) => (
          <div key={app.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[var(--ink-primary)] truncate max-w-[65%]">{app.name}</span>
              <span className="text-[var(--ink-tertiary)]">{formatDuration(app.duration)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
              <div
                className={cn("h-full rounded-full")}
                style={{ width: `${(app.duration / maxDuration) * 100}%`, background: CATEGORY_COLORS[app.category] || "#94a3b8" }}
              />
            </div>
          </div>
        ))}
        {apps.length === 0 && <p className="text-xs text-[var(--ink-tertiary)]">No tracked app activity for this range.</p>}
      </div>
    </div>
  );
};

export default AppUsageChart;
