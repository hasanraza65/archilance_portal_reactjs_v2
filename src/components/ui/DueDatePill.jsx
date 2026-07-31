import React from "react";
import DatePicker from "./DatePicker";
import Icon from "./Icon";
import { formatRelativeDue, isOverdue } from "@/lib/format";
import { isCompletedStatus } from "@/lib/statusMeta";
import { cn } from "@/lib/cn";

const DueDatePill = ({ date, status, onChange, size = "sm", editable = true }) => {
  const overdue = isOverdue(date, isCompletedStatus(status));
  const label = date ? formatRelativeDue(date) : "No date";

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap transition-colors",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
        editable && "cursor-pointer hover:brightness-95",
        overdue
          ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          : date
          ? "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]"
          : "text-[var(--ink-tertiary)] border border-dashed border-[var(--line-strong)]"
      )}
    >
      <Icon icon="solar:calendar-linear" className="text-[12px]" />
      {label}
    </span>
  );

  if (!editable) return pill;

  return <DatePicker value={date} onChange={onChange} trigger={pill} />;
};

export default DueDatePill;
