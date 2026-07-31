import React from "react";
import DatePicker from "./DatePicker";
import Icon from "./Icon";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * DatePicker wrapped in the standard bordered control, so date inputs match the
 * text inputs beside them. `value`/`onChange` are ISO `YYYY-MM-DD` strings.
 */
const DateField = ({ value, onChange, placeholder = "Select date", clearable = true, align = "left", disabled }) => (
  <div className="relative">
    <DatePicker
      value={value}
      onChange={onChange}
      align={align}
      anchorClassName="flex w-full"
      trigger={
        <span
          className={cn(
            "w-full flex items-center gap-2.5 px-3.5 h-11 rounded-xl border border-[var(--line-subtle)]",
            "bg-[var(--surface-raised)] text-sm transition-colors",
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary-400"
          )}
        >
          <Icon icon="solar:calendar-linear" className="text-primary-500 text-[16px] flex-none" />
          <span className={value ? "text-[var(--ink-primary)]" : "text-[var(--ink-tertiary)]"}>
            {value ? formatDate(value) : placeholder}
          </span>
        </span>
      }
    />
    {clearable && value && !disabled && (
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="Clear date"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] z-10"
      >
        <Icon icon="solar:close-circle-linear" className="text-[15px]" />
      </button>
    )}
  </div>
);

export default DateField;
