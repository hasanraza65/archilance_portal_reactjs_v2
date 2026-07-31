import React from "react";
import { cn } from "@/lib/cn";
import { statusMeta, priorityMeta } from "@/lib/statusMeta";
import Icon from "./Icon";

export const StatusPill = ({ status, size = "sm", className, onClick }) => {
  const meta = statusMeta(status);
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap transition-transform",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        onClick && "hover:brightness-95 active:scale-95 cursor-pointer",
        className
      )}
      style={{ background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: meta.color }} />
      {meta.label}
    </Comp>
  );
};

export const PriorityPill = ({ priority, size = "sm", className, onClick, showLabel = true }) => {
  const meta = priorityMeta(priority);
  if (!meta) {
    return onClick ? (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] rounded-full px-2 py-1 text-[11px] border border-dashed border-[var(--line-strong)]",
          className
        )}
      >
        <Icon icon="solar:flag-linear" className="text-[13px]" />
        {showLabel && "Priority"}
      </button>
    ) : null;
  }
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
        onClick && "hover:brightness-95 active:scale-95 cursor-pointer transition-transform",
        className
      )}
      style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
    >
      <Icon icon={meta.icon} className="text-[13px]" />
      {showLabel && meta.label}
    </Comp>
  );
};
