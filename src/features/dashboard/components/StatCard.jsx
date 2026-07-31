import React from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Headline metric tile. Clickable when `onClick` is given (drills into a filter). */
const StatCard = ({ label, value, sub, icon, color = "#6d5ef8", onClick, active, delay = 0, loading }) => {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className={cn(
        "text-left rounded-2xl border bg-[var(--surface-raised)] p-4 transition-all",
        active ? "border-primary-400 ring-2 ring-primary-500/20" : "border-[var(--line-subtle)]",
        onClick && "hover:shadow-card hover:-translate-y-0.5 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-none" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <Icon icon={icon} className="text-[15px]" style={{ color }} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] truncate">{label}</span>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-16 rounded" />
      ) : (
        <p className="text-2xl font-bold text-[var(--ink-primary)] leading-none">{value}</p>
      )}
      {sub && <p className="text-[11px] text-[var(--ink-tertiary)] mt-1.5">{sub}</p>}
    </Comp>
  );
};

export default StatCard;
