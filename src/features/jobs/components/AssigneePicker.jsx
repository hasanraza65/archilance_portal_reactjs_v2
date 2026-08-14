import React, { useMemo, useState, useRef, useEffect } from "react";
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

  const toggle = (emp) => {
    const isSelected = assignees.some((a) => a.id === emp.id);
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
        <AssigneeListPanel employees={employees} assignees={assignees} onToggle={toggle} />
      </PopoverPanel>
    </Popover>
  );
};

/**
 * Search box + selectable list. Split out from AssigneePicker so it remounts
 * fresh every time the popover opens (PopoverPanel unmounts its children on
 * close by default) — that gives the "picked float to top" sort below a
 * natural place to freeze. It used to re-sort on every toggle instead, which
 * relocated the row you'd just clicked out from under the cursor and dragged
 * focus (and the whole page's scroll) back up toward the top of the list.
 */
const AssigneeListPanel = ({ employees, assignees, onToggle }) => {
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(() => new Set(assignees.map((a) => a.id)), [assignees]);
  const searchRef = useRef(null);

  // Snapshot taken once, on mount (i.e. once per time the popover opens) — the
  // sort order stays pinned to who was already assigned *then*, so ticking a
  // box mid-session doesn't move anything.
  const pinnedIds = useRef(selectedIds).current;

  // Not `autoFocus`: the panel is positioned with anchor positioning, which
  // settles its final on-screen spot a frame after mount. `autoFocus` grabs
  // focus before that happens, and since the browser scrolls whatever's
  // focused into view, it was scrolling the *pre-anchor* (top-left-ish)
  // position into view — i.e. yanking the whole page up to the top the
  // instant the popover opened. `preventScroll` stops that; the panel is
  // already visible next to the button, so no scroll is needed anyway.
  useEffect(() => {
    searchRef.current?.focus({ preventScroll: true });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? employees.filter((e) => e.name?.toLowerCase().includes(q)) : employees;
    const picked = [];
    const rest = [];
    for (const e of base) (pinnedIds.has(e.id) ? picked : rest).push(e);
    return [...picked, ...rest];
  }, [employees, query, pinnedIds]);

  return (
    <>
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
            ref={searchRef}
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
            const showDivider = !checked && i > 0 && pinnedIds.has(filtered[i - 1].id);
            return (
              <React.Fragment key={emp.id}>
                {showDivider && <div className="my-1.5 mx-2 h-px bg-[var(--line-subtle)]" />}
                <button
                  type="button"
                  onClick={() => onToggle(emp)}
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
    </>
  );
};

export default AssigneePicker;
