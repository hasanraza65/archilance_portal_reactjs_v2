import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const EmployeesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManageEmployees(user?.role);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isFetching } = useEmployeesList({ page, perPage, search: debouncedSearch });
  const items = data?.items || [];

  return (
    <div className="pb-10">
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} total` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email or phone…"
                className="pl-9 pr-3 h-9 w-64 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
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
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon="solar:users-group-rounded-linear" title="No employees found" description={search ? "Try a different search." : undefined} />
        ) : (
          <div className={cn("rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden transition-opacity", isFetching && "opacity-70")}>
            <div className="divide-y divide-[var(--line-subtle)]">
              {items.map((e) => (
                <div
                  key={e.id}
                  onClick={() => navigate(`/work-diary/${e.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                >
                  <Avatar name={e.name} src={e.profile_pic ? getMediaUrl(e.profile_pic) : null} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">{e.name}</span>
                      {e.employee_type && (
                        <Badge tone={TYPE_TONE[e.employee_type.toLowerCase()] || "neutral"} size="sm">{e.employee_type}</Badge>
                      )}
                      {e.timer_status === "Online" && <Badge tone="success" dot>Online</Badge>}
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
                  {/* Row click stays on the work diary — the profile and edit
                      screens get their own buttons so both are one click away. */}
                  <div
                    className="flex items-center gap-0.5 flex-none"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <IconButton
                      icon="solar:user-circle-bold-duotone"
                      size="sm"
                      label="View profile"
                      onClick={() => navigate(`/employees/${e.id}`)}
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
