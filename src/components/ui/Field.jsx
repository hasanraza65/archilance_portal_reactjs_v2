import React from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm " +
  "placeholder:text-[var(--ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 " +
  "focus:border-primary-400 transition-shadow disabled:opacity-60";

/** Label + control + error/hint, so every form in the app lines up the same way. */
export const Field = ({ label, error, hint, required, children, className }) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-danger-500 mt-1">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-[var(--ink-tertiary)] mt-1">{hint}</p>
    ) : null}
  </div>
);

export const TextField = React.forwardRef(({ className, invalid, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, invalid && "border-danger-400", className)} {...rest} />
));
TextField.displayName = "TextField";

export const TextArea = React.forwardRef(({ className, rows = 3, ...rest }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(inputClass, "h-auto py-3 resize-none", className)}
    {...rest}
  />
));
TextArea.displayName = "TextArea";

export default Field;
