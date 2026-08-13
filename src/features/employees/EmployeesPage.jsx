import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Button from "@/components/ui/Button";
import MobileFilterBar from "@/components/ui/MobileFilterBar";
import { useEmployeesList } from "./useEmployeesList";
import { useDebounce } from "@/hooks/useDebounce";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { canManageEmployees } from "@/lib/roles";
import { cn } from "@/lib/cn";

const TYPE_TONE = {
  manager: "success",
  executive: "primary",
  supervisor: "info",
  internee: "warning",
  outsource: "neutral",
};

// "Filter by type" is role-gated exactly like the v1 app it mirrors (same
// backend/API — see src/lib/roles.js). "Coordinator" is a display-only label;
// the value sent to the backend is always "Supervisor". Full spec:
// docs/employee-filters.md.
const TYPE_FILTER_LABELS = {
  Manager: "Manager",
  Executive: "Executive",
  Supervisor: "Coordinator",
  Employee: "Employee",
  Internee: "Internee",
  Outsource: "Outsource",
  none: "Unassigned",
};

const TYPE_FILTER_OPTIONS_BY_ROLE = {
  admin: ["Manager", "Executive", "Supervisor", "Employee", "Internee", "Outsource", "none"],
  executive: ["Manager", "Supervisor", "Employee", "Internee", "none"],
  manager: ["Supervisor", "Employee", "Internee", "none"],
  supervisor: ["Employee", "Internee", "none"],
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "extra-time", label: "Extra Time" },
];

// A running timer past this many hours counts as "Extra Time" instead of
// plain "Online" — same hardcoded threshold the v1 app uses.
const EXTRA_TIME_THRESHOLD_HOURS = 8;

function presenceStatus(e) {
  if (!e.start_datetime) return "offline";
  const elapsedHours = (Date.now() - new Date(e.start_datetime).getTime()) / 3600000;
  return elapsedHours >= EXTRA_TIME_THRESHOLD_HOURS ? "extra-time" : "online";
}

/** Plain checkbox rows — shared between the desktop popover and the mobile sheet. */
const TypeCheckboxList = ({ options, selected, onToggle }) => (
  <div className="space-y-0.5">
    {options.map((value) => {
      const checked = selected.includes(value);
      return (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
            checked ? "bg-primary-50 dark:bg-primary-500/10 text-[var(--ink-primary)]" : "text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]"
          )}
        >
          <span className={cn("w-4 h-4 rounded border flex items-center justify-center flex-none", checked ? "bg-primary-500 border-primary-500" : "border-[var(--line-strong)]")}>
            {checked && <Icon icon="solar:check-read-linear" className="text-white text-[10px]" />}
          </span>
          {TYPE_FILTER_LABELS[value] || value}
        </button>
      );
    })}
  </div>
);

const TypeFilterMenu = ({ options, selected, onToggle, onClear }) => {
  if (options.length === 0) return null;
  return (
    <Popover className="relative">
      <PopoverButton
        className={cn(
          "h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors",
          selected.length > 0
            ? "border-primary-400 bg-primary-500/10 text-primary-600 dark:text-primary-400"
            : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
        )}
      >
        <Icon icon="solar:filter-linear" className="text-[15px]" />
        Filter by type
        {selected.length > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
            {selected.length}
          </span>
        )}
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="bottom start"
        className="z-50 w-56 mt-2 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <TypeCheckboxList options={options} selected={selected} onToggle={onToggle} />
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="w-full text-center text-xs text-[var(--ink-tertiary)] hover:text-primary-500 py-1.5 mt-1 border-t border-[var(--line-subtle)]"
          >
            Clear
          </button>
        )}
      </PopoverPanel>
    </Popover>
  );
};

/** Plain radio-style rows — used inline in the mobile filter sheet. */
const StatusOptionList = ({ value, onChange }) => (
  <div className="space-y-0.5">
    {STATUS_FILTER_OPTIONS.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
            active ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium" : "text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]"
          )}
        >
          {o.label}
          {active && <Icon icon="solar:check-read-linear" className="text-[13px] flex-none" />}
        </button>
      );
    })}
  </div>
);

/** Same look as TypeFilterMenu — a themed popover instead of the browser's
 * native <select> chrome. Options double as PopoverButtons so picking one
 * both applies it and closes the panel. */
const StatusFilterMenu = ({ value, onChange }) => {
  const current = STATUS_FILTER_OPTIONS.find((o) => o.value === value) || STATUS_FILTER_OPTIONS[0];
  return (
    <Popover className="relative">
      <PopoverButton
        className={cn(
          "h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors",
          value
            ? "border-primary-400 bg-primary-500/10 text-primary-600 dark:text-primary-400"
            : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
        )}
      >
        {current.label}
        <Icon icon="solar:alt-arrow-down-linear" className="text-[11px] opacity-60" />
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="bottom end"
        className="z-50 w-40 mt-2 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-1.5 transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        {STATUS_FILTER_OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <PopoverButton
              key={o.value}
              as="button"
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
                active ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium" : "text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]"
              )}
            >
              {o.label}
              {active && <Icon icon="solar:check-read-linear" className="text-[13px] flex-none" />}
            </PopoverButton>
          );
        })}
      </PopoverPanel>
    </Popover>
  );
};

const EmployeesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManageEmployees(user?.role);
  const isAdmin = user?.role === "admin";
  // Team is only shown to admin — everyone else who can open this list
  // (executive, manager, supervisor) doesn't need the team grouping.
  const canSeeTeam = user?.role === "admin";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const allowedTypeValues = useMemo(() => TYPE_FILTER_OPTIONS_BY_ROLE[user?.role] || [], [user?.role]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  // Admin-only, and applied to whatever page of results already came back —
  // it is not sent to the backend. See docs/employee-filters.md #3.
  const [statusFilter, setStatusFilter] = useState("");

  const toggleType = (value) => {
    setSelectedTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setPage(1);
  };
  const clearTypes = () => { setSelectedTypes([]); setPage(1); };
  const clearAllFilters = () => { setSelectedTypes([]); setStatusFilter(""); setPage(1); };

  // Nobody picked a type explicitly: admin sees everyone (no param sent),
  // every other role is scoped to whatever their own role is allowed to see.
  const employeeTypeParam = selectedTypes.length > 0
    ? selectedTypes.join(",")
    : isAdmin ? undefined : allowedTypeValues.join(",") || undefined;

  const { data, isLoading, isFetching } = useEmployeesList({
    page, perPage, search: debouncedSearch, employeeType: employeeTypeParam,
  });
  const items = data?.items || [];
  const visibleItems = isAdmin && statusFilter ? items.filter((e) => presenceStatus(e) === statusFilter) : items;

  const chips = [
    ...selectedTypes.map((v) => ({ key: `type-${v}`, label: TYPE_FILTER_LABELS[v] || v, onRemove: () => toggleType(v) })),
    ...(isAdmin && statusFilter
      ? [{ key: "status", label: STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label, onRemove: () => setStatusFilter("") }]
      : []),
  ];

  return (
    <div className="pb-10">
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} total` : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative hidden sm:block">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email or phone…"
                className="pl-9 pr-3 h-9 w-64 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <TypeFilterMenu options={allowedTypeValues} selected={selectedTypes} onToggle={toggleType} onClear={clearTypes} />
              {isAdmin && <StatusFilterMenu value={statusFilter} onChange={(v) => setStatusFilter(v)} />}
            </div>
            {canManage && (
              <Button icon="solar:user-plus-bold" onClick={() => navigate("/employees/new")}>Add Employee</Button>
            )}
          </div>
        }
        mobileActions={
          canManage && (
            <IconButton
              icon="solar:user-plus-bold"
              variant="primary"
              label="Add employee"
              onClick={() => navigate("/employees/new")}
            />
          )
        }
      />

      {/* Mobile: search gets the full width it needs instead of a 16rem stub. */}
      <div className="px-4 mt-3">
        <MobileFilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search name, email or phone…"
          activeCount={chips.length}
          chips={chips}
          onClearAll={chips.length > 0 ? clearAllFilters : undefined}
          sheetTitle="Filters"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-1.5 px-1">Filter by type</p>
            <TypeCheckboxList options={allowedTypeValues} selected={selectedTypes} onToggle={toggleType} />
          </div>
          {isAdmin && (
            <div>
              <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-1.5 px-1">Status</p>
              <StatusOptionList value={statusFilter} onChange={(v) => setStatusFilter(v)} />
            </div>
          )}
        </MobileFilterBar>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon="solar:users-group-rounded-linear" title="No employees found" description={search ? "Try a different search." : undefined} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon="solar:filter-linear"
            title="No employees match this filter"
            description="Nobody on this page is currently that status — try clearing the status filter or checking another page."
          />
        ) : (
          <div className={cn("rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden transition-opacity", isFetching && "opacity-70")}>
            <div className="divide-y divide-[var(--line-subtle)]">
              {visibleItems.map((e) => (
                <div
                  key={e.id}
                  onClick={() => navigate(`/employees/${e.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                >
                  <Avatar name={e.name} src={e.profile_pic ? getMediaUrl(e.profile_pic) : null} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">{e.name}</span>
                      {e.employee_type && (
                        <Badge tone={TYPE_TONE[e.employee_type.toLowerCase()] || "neutral"} size="sm">{e.employee_type}</Badge>
                      )}
                      {canSeeTeam && e.employee_team && (
                        <Badge tone="neutral" size="sm">{e.employee_team}</Badge>
                      )}
                      {presenceStatus(e) === "online" && <Badge tone="success" dot>Online</Badge>}
                      {presenceStatus(e) === "extra-time" && <Badge tone="danger" dot>Extra Time</Badge>}
                    </div>
                    <p className="text-xs text-[var(--ink-tertiary)] truncate">{e.email || e.phone || "—"}</p>
                    {/* Hours move under the name on mobile — there's no room for a
                        right-hand column once the avatar and actions are placed. */}
                    {(e.today_time || e.week_time) && (
                      <p className="sm:hidden text-[11px] text-[var(--ink-secondary)] mt-1">
                        Today <b className="text-[var(--ink-primary)]">{e.today_time || "0h 0m"}</b>
                        <span className="mx-1.5 text-[var(--ink-tertiary)]">·</span>
                        Week <b className="text-[var(--ink-primary)]">{e.week_time || "0h 0m"}</b>
                      </p>
                    )}
                  </div>
                  {(e.today_time || e.week_time) && (
                    <div className="hidden sm:flex flex-col items-end text-xs text-[var(--ink-secondary)]">
                      <span>Today: <b className="text-[var(--ink-primary)]">{e.today_time || "0h 0m"}</b></span>
                      <span>Week: <b className="text-[var(--ink-primary)]">{e.week_time || "0h 0m"}</b></span>
                    </div>
                  )}
                  {/* Row click opens the profile — work diary and edit get
                      their own buttons so both stay one click away. */}
                  <div
                    className="flex items-center gap-0.5 flex-none"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <IconButton
                      icon="solar:clock-circle-bold-duotone"
                      size="sm"
                      label="Work diary"
                      onClick={() => navigate(`/work-diary/${e.id}`)}
                    />
                    {canManage && (
                      <IconButton
                        icon="solar:pen-linear"
                        size="sm"
                        label="Edit employee"
                        onClick={() => navigate(`/employees/${e.id}/edit`)}
                      />
                    )}
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" className="hidden sm:block text-[var(--ink-tertiary)] text-[15px] flex-none" />
                </div>
              ))}
            </div>

            {data?.lastPage > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line-subtle)]">
                <span className="text-xs text-[var(--ink-tertiary)]">Page {data.currentPage} of {data.lastPage}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
                  <button disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
