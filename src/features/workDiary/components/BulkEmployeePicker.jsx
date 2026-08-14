import React, { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

/**
 * Who to include in a bulk export.
 *
 * The roster comes from /employee-user, which the backend already restricts to
 * user_role = 3 — so customers, customer team members and admins can never
 * appear here, and there's no client-side filtering standing between the user
 * and a mistake. Everyone starts ticked (the common case is "the whole team");
 * deactivated staff are the one exception, listed but unticked, because
 * including a leaver in a monthly report is nearly always an accident.
 */

const ROW_HEIGHT = "h-[58px]";

const Check = ({ checked, indeterminate }) => (
  <span
    className={cn(
      "w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center flex-none transition-colors",
      checked || indeterminate
        ? "bg-primary-500 border-primary-500 text-white"
        : "border-[var(--line-strong)] bg-[var(--surface-raised)]"
    )}
  >
    {indeterminate ? (
      <span className="w-2 h-[2px] rounded-full bg-current" />
    ) : checked ? (
      <Icon icon="solar:check-circle-bold" className="text-[13px]" />
    ) : null}
  </span>
);

const BulkEmployeePicker = ({ employees, selectedIds, onChange, disabled }) => {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");

  const teams = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => e.employee_team && set.add(e.employee_team));
    return [...set].sort();
  }, [employees]);

  const isActive = (e) => Number(e.contract_status ?? 1) === 1;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (team !== "all" && (e.employee_team || "") !== team) return false;
      if (!q) return true;
      return [e.name, e.email, e.employee_type, e.employee_team]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [employees, search, team]);

  const visibleIds = visible.map((e) => e.id);
  const selectedVisible = visibleIds.filter((id) => selectedIds.has(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  // Select-all acts on what's on screen, not on the whole roster — otherwise a
  // filter narrows the list but the button silently ticks people you can't see.
  const toggleAllVisible = () => {
    if (disabled) return;
    const next = new Set(selectedIds);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      {/* ---------------------------- toolbar ---------------------------- */}
      <div className="p-3 border-b border-[var(--line-subtle)] space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Icon
              icon="solar:magnifer-linear"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--ink-tertiary)] pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or team…"
              className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-app)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] outline-none focus:border-primary-400"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleAllVisible}
            disabled={disabled || visibleIds.length === 0}
            className="flex-none"
          >
            {allVisibleSelected ? "Clear" : "Select all"}
          </Button>
        </div>

        {teams.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {["all", ...teams].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-none",
                  team === t
                    ? "bg-primary-500 text-white"
                    : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                {t === "all" ? "All teams" : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------- list ------------------------------ */}
      <div className="max-h-[420px] overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)] text-center py-10">
            No one matches that search.
          </p>
        ) : (
          visible.map((e) => {
            const checked = selectedIds.has(e.id);
            const active = isActive(e);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggle(e.id)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 text-left border-b border-[var(--line-subtle)] last:border-b-0 transition-colors",
                  ROW_HEIGHT,
                  disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[var(--surface-sunken)]",
                  checked && "bg-primary-500/[0.06]"
                )}
              >
                <Check checked={checked} />
                <Avatar
                  name={e.name}
                  src={e.profile_pic ? getMediaUrl(e.profile_pic) : null}
                  size="sm"
                  className="flex-none"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--ink-primary)] truncate">
                    {e.name}
                  </span>
                  <span className="block text-xs text-[var(--ink-tertiary)] truncate">
                    {e.email || "No email"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 flex-none">
                  {!active && <Badge tone="warning" size="sm">Inactive</Badge>}
                  {e.employee_team && (
                    <Badge tone="neutral" size="sm" className="hidden sm:inline-flex">
                      {e.employee_team}
                    </Badge>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ---------------------------- footer ----------------------------- */}
      <div className="px-3 py-2.5 border-t border-[var(--line-subtle)] bg-[var(--surface-sunken)] flex items-center justify-between">
        <p className="text-xs text-[var(--ink-secondary)]">
          <span className="font-semibold text-[var(--ink-primary)]">{selectedIds.size}</span>
          {" of "}{employees.length} selected
          {visible.length !== employees.length && (
            <span className="text-[var(--ink-tertiary)]"> · {visible.length} shown</span>
          )}
        </p>
        {selectedIds.size > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-xs font-medium text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkEmployeePicker;
export const defaultSelection = (employees) =>
  new Set(employees.filter((e) => Number(e.contract_status ?? 1) === 1).map((e) => e.id));
