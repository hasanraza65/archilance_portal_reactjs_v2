import React from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { formatDuration } from "@/lib/format";

const WeekActivityChart = ({ series = [] }) => {
  const max = Math.max(...series.map((d) => d.seconds), 1);
  const today = series[series.length - 1]?.key;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--ink-tertiary)" }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--ink-tertiary) 10%, transparent)" }}
            formatter={(v) => [formatDuration(v), "Worked"]}
            contentStyle={{
              borderRadius: 10,
              fontSize: 12,
              border: "1px solid var(--line-subtle)",
              background: "var(--surface-raised)",
              color: "var(--ink-primary)",
            }}
          />
          <Bar dataKey="seconds" radius={[6, 6, 0, 0]}>
            {series.map((d) => (
              <Cell
                key={d.key}
                fill={d.key === today ? "#6d5ef8" : d.seconds >= max * 0.75 ? "#8b7bff" : "#cbcfd8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeekActivityChart;
