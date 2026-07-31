import React from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  primary: "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

const Badge = ({ children, tone = "neutral", dot, className, size = "sm" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap",
      size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      TONES[tone],
      className
    )}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "currentColor" }} />}
    {children}
  </span>
);

export default Badge;
