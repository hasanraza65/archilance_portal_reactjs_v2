import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import JobFormModal from "./components/JobFormModal";
import { useJobs } from "./useJobsData";
import JobRow from "./components/JobRow";
import TaskDetailSheet from "@/features/tasks/TaskDetailSheet";
import KanbanBoard from "./components/KanbanBoard";
import CalendarView from "./components/CalendarView";
import TableView from "./components/TableView";
import MembersView from "./components/MembersView";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import { useAuth } from "@/auth/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";

const BASE_VIEWS = [
  { key: "list", label: "List", icon: "solar:checklist-minimalistic-linear" },
  { key: "board", label: "Board", icon: "solar:widget-4-linear" },
  { key: "calendar", label: "Calendar", icon: "solar:calendar-linear" },
  { key: "table", label: "Table", icon: "solar:widget-linear" },
];

// Members View is a cross-project, per-employee breakdown — the backend gates
// it to admin/manager/supervisor/executive, so the tab only shows for them.
const MEMBERS_VIEW_ROLES = ["admin", "manager", "supervisor", "executive"];

const JobsListPage = () => {
  const { user } = useAuth();
  const { data: jobs, isLoading } = useJobs({ assignedMe: user?.role === "manager" });
  const canSeeMembers = MEMBERS_VIEW_ROLES.includes(user?.role);
  const VIEWS = canSeeMembers
    ? [...BASE_VIEWS, { key: "members", label: "Members", icon: "solar:users-group-rounded-linear" }]
    : BASE_VIEWS;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [view, setView] = useState("list");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);

  // Creating a job is a management action — customers and their team members
  // consume jobs, they don't open them.
  const canCreateJob = ["admin", "manager", "supervisor", "executive"].includes(user?.role);

  const openTaskId = searchParams.get("task");
  const setOpenTaskId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("task", id);
    else next.delete("task");
    setSearchParams(next, { replace: true });
  };

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (!debouncedSearch.trim()) return jobs;
    const q = debouncedSearch.toLowerCase();
    return jobs.filter((j) => j.project_name?.toLowerCase().includes(q) || j.customer?.name?.toLowerCase().includes(q));
  }, [jobs, debouncedSearch]);

  const grouped = useMemo(() => {
    const map = new Map(STATUS_OPTIONS.map((s) => [s.value, []]));
    for (const job of filteredJobs) {
      const bucket = STATUS_OPTIONS.find((s) => s.value.toLowerCase() === String(job.status || "").toLowerCase());
      const key = bucket?.value || STATUS_OPTIONS[0].value;
      map.get(key)?.push(job);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [filteredJobs]);

  const isEditable = ["admin", "manager", "supervisor", "executive", "employee", "outsource", "internee"].includes(user?.role);

  const jobForBoard = selectedJobId ? jobs?.find((j) => j.id === selectedJobId) : filteredJobs[0];

  return (
    <div className="pb-10">
      <PageHeader
        title="Jobs"
        subtitle={jobs ? `${jobs.length} job${jobs.length === 1 ? "" : "s"}` : undefined}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs…"
                className="pl-9 pr-3 h-10 sm:h-9 w-full sm:w-56 text-[16px] sm:text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
            {canCreateJob && (
              <Button icon="solar:add-circle-bold" className="flex-none whitespace-nowrap" onClick={() => setJobFormOpen(true)}>New Job</Button>
            )}
          </div>
        }
        tabs={
          <div className="flex gap-1 -mb-px min-w-max">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex-none whitespace-nowrap",
                  view === v.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                )}
              >
                <Icon icon={v.icon} className="text-[15px]" />
                {v.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {view === "members" && canSeeMembers ? (
          // Members View reads its own cross-project query — it doesn't depend
          // on `jobs`, so it must bypass the jobs loading/empty gate below.
          <MembersView onOpenTask={setOpenTaskId} />
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon="solar:folder-open-linear"
            title={debouncedSearch ? "No jobs match your search" : "No jobs yet"}
            description={debouncedSearch ? "Try a different search term." : "Jobs assigned to you will show up here."}
          />
        ) : view === "list" ? (
          <div className="space-y-6">
            {grouped.map(([status, list]) => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm font-semibold text-[var(--ink-primary)]">{STATUS_OPTIONS.find((s) => s.value === status)?.label}</span>
                  <span className="text-xs text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-2 py-0.5">{list.length}</span>
                </div>
                <div className="space-y-2.5">
                  {list.map((job) => (
                    <JobRow key={job.id} job={job} onOpenTask={setOpenTaskId} isEditable={isEditable} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : view === "board" ? (
          <KanbanBoard
            jobs={filteredJobs}
            selectedJobId={jobForBoard?.id}
            onSelectJob={setSelectedJobId}
            onOpenTask={setOpenTaskId}
            isEditable={isEditable}
          />
        ) : view === "calendar" ? (
          <CalendarView jobs={filteredJobs} selectedJobId={jobForBoard?.id} onSelectJob={setSelectedJobId} onOpenTask={setOpenTaskId} />
        ) : (
          <TableView jobs={filteredJobs} selectedJobId={jobForBoard?.id} onSelectJob={setSelectedJobId} onOpenTask={setOpenTaskId} />
        )}
      </div>

      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      <JobFormModal open={jobFormOpen} onClose={() => setJobFormOpen(false)} />
    </div>
  );
};

export default JobsListPage;
