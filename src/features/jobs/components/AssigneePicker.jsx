import React, { useMemo, useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import Avatar from "@/components/ui/Avatar";
import AvatarStack from "@/components/ui/AvatarStack";
import Icon from "@/components/ui/Icon";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

/**
 * `assignees` = [{id, name, avatar}] currently on the task/job.
 * `onChange(employeeIds:number[], employees:object[])` fires on every toggle —
 * both forms are passed so the caller can optimistically patch its cache with
 * real names/avatars instead of going blank until the server responds.
 */
const AssigneePicker = ({ assignees = [], onChange, disabled = false, size = "sm" }) => {
  const { data: employees = [] } = useAllEmployees();
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(() => new Set(assignees.map((a) => a.id)), [assignees]);

  // Already-assigned people float to the top (stable within each group) so the
  // current selection is always visible without scrolling.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? employees.filter((e) => e.name?.toLowerCase().includes(q)) : employees;
    const picked = [];
    const rest = [];
    for (const e of base) (selectedIds.has(e.id) ? picked : rest).push(e);
    return [...picked, ...rest];
  }, [employees, query, selectedIds]);

  const toggle = (emp) => {
    const isSelected = selectedIds.has(emp.id);
    const nextList = isSelected ? assignees.filter((a) => a.id !== emp.id) : [...assignees, { id: emp.id, name: emp.name, avatar: emp.profile_pic ? getMediaUrl(emp.profile_pic) : null }];
    onChange(
      nextList.map((a) => a.id),
      nextList.map((a) => ({ id: a.id, name: a.name, profile_pic: employees.find((e) => e.id === a.id)?.profile_pic }))
    );
  };

  const trigger =
    assignees.length > 0 ? (
      <span className="inline-flex items-center gap-1 group">
        <AvatarStack people={assignees} size={size} />
        <span className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full border border-dashed border-[var(--line-strong)] flex items-center justify-center text-[var(--ink-tertiary)]">
          <Icon icon="solar:add-circle-linear" className="text-[11px]" />
        </span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-[var(--line-strong)] text-[var(--ink-tertiary)] hover:border-primary-400 hover:text-primary-500 hover:bg-primary-500/5 transition-colors text-[11px] font-medium">
        <Icon icon="solar:user-plus-linear" className="text-[13px]" />
        Assign
      </span>
    );

  if (disabled) return assignees.length > 0 ? <AvatarStack people={assignees} size={size} /> : null;

  return (
    <Popover className="relative inline-flex">
      <PopoverButton as="div" className="cursor-pointer">
        {trigger}
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="bottom start"
        className="z-50 w-72 mt-2 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel flex flex-col max-h-96 transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <div className="p-3 border-b border-[var(--line-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--ink-primary)]">Assign people</span>
            {assignees.length > 0 && (
              <span className="text-[10px] text-[var(--ink-tertiary)]">{assignees.length} selected</span>
            )}
          </div>
          <div className="relative">
            <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[13px]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full pl-7 pr-2.5 h-8 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-[var(--ink-tertiary)] text-center py-6">No matches.</p>
          ) : (
            filtered.map((emp, i) => {
              const checked = selectedIds.has(emp.id);
              // Divider between the pinned (assigned) group and everyone else.
              const showDivider = !checked && i > 0 && selectedIds.has(filtered[i - 1].id);
              return (
                <React.Fragment key={emp.id}>
                  {showDivider && <div className="my-1.5 mx-2 h-px bg-[var(--line-subtle)]" />}
                  <button
                    type="button"
                    onClick={() => toggle(emp)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                      checked ? "bg-primary-50 dark:bg-primary-500/10" : "hover:bg-[var(--surface-sunken)]"
                    )}
                  >
                    <Avatar name={emp.name} src={emp.profile_pic ? getMediaUrl(emp.profile_pic) : null} size="sm" />
                    <span className="flex-1 min-w-0 text-sm text-[var(--ink-primary)] truncate">{emp.name}</span>
                    <span
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center flex-none transition-colors",
                        checked ? "bg-primary-500 border-primary-500" : "border-[var(--line-strong)]"
                      )}
                    >
                      {checked && <Icon icon="solar:check-read-linear" className="text-white text-[12px]" />}
                    </span>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};

export default AssigneePicker;
