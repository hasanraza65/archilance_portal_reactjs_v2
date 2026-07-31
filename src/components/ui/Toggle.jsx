import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Accessible on/off switch. Controlled — pass `checked` and `onChange(next)`. */
const Toggle = ({ checked, onChange, disabled = false, label, id, className }) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]",
      checked ? "bg-primary-500" : "bg-[var(--line-strong)]",
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      className
    )}
  >
    <motion.span
      layout
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      className="inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm"
      style={{ marginLeft: checked ? 24 : 4 }}
    />
  </button>
);

export default Toggle;
