import React from "react";
import { cn } from "@/lib/cn";

/** 0–5 score → colour. Deliberately harsh at the bottom: a 0 must look like a 0. */
export function scoreTone(value) {
  const n = Number(value) || 0;
  if (n >= 4.5) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Excellent" };
  if (n >= 3.5) return { bar: "bg-lime-500", text: "text-lime-600 dark:text-lime-400", label: "Good" };
  if (n >= 2.5) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Fair" };
  if (n > 0) return { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Needs work" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "No credit" };
}

export const ScoreBar = ({ value, max = 5, className }) => {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  const tone = scoreTone(value);
  return (
    <div className={cn("h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Clickable 0–5 selector. 0 is a real, selectable score, not "unset". */
export const ScorePicker = ({ value, onChange, disabled }) => (
  <div className="flex items-center gap-1">
    {[0, 1, 2, 3, 4, 5].map((n) => {
      const active = Number(value) === n;
      return (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "w-8 h-8 rounded-lg text-xs font-bold transition-colors flex-none",
            disabled && "opacity-50 cursor-not-allowed",
            active
              ? n === 0
                ? "bg-red-500 text-white"
                : "bg-primary-500 text-white"
              : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] hover:bg-[var(--line-subtle)]"
          )}
        >
          {n}
        </button>
      );
    })}
  </div>
);

export default ScoreBar;
