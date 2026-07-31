import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StatCard from "./components/StatCard";
import WeekActivityChart from "./components/WeekActivityChart";
import TaskListCard from "./components/TaskListCard";
import TeamPanel from "./components/TeamPanel";
import {
  useMyTasks, useMyWeekSessions, useTeamSnapshot, useMyLeaves,
  useContractsSnapshot, useTaskBuckets, useWeekSeries,
} from "./useDashboardData";
import { useAuth } from "@/auth/AuthContext";
import { useUI } from "@/store/UIContext";
import { formatDuration, formatDate } from "@/lib/format";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import { cn } from "@/lib/cn";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const MANAGER_ROLES = ["manager", "supervisor", "executive", "admin"];
const CONTRACT_ROLES = ["executive", "admin"];

const FOCUS_FILTERS = [
  { key: "overdue", label: "Overdue", icon: "solar:danger-triangle-bold", color: "#ef4444" },
  { key: "dueToday", label: "Due today", icon: "solar:calendar-date-bold-duotone", color: "#f59e0b" },
  { key: "dueThisWeek", label: "This week", icon: "solar:calendar-linear", color: "#3b82f6" },
  { key: "urgent", label: "Urgent", icon: "solar:fire-bold", color: "#f97316" },
  { key: "open", label: "All open", icon: "solar:checklist-minimalistic-linear", color: "#6d5ef8" },
];

const MyDashboardPage = () => {
  const { user } = useAuth();
  const { setQuickCreateOpen } = useUI();
  const navigate = useNavigate();
  const [focus, setFocus] = useState("dueThisWeek");

  const isManagerish = MANAGER_ROLES.includes(user?.role);
  const canSeeContracts = CONTRACT_ROLES.includes(user?.role);

  const { data: taskData, isLoading: tasksLoading } = useMyTasks();
  const { data: sessionData, isLoading: sessionsLoading } = useMyWeekSessions();
  const { data: team = [], isLoading: teamLoading } = useTeamSnapshot(isManagerish);
  const { data: leaves = [] } = useMyLeaves();
  const { data: contracts } = useContractsSnapshot(canSeeContracts);

  const tasks = taskData?.tasks || [];
  const jobs = taskData?.jobs || [];
  const buckets = useTaskBuckets(tasks);

  const sessions = sessionData?.data || [];
  const weekSeries = useWeekSeries(sessions);
  const weekSeconds = weekSeries.reduce((s, d) => s + d.seconds, 0);
  const todaySeconds = weekSeries[weekSeries.length - 1]?.seconds || 0;

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  const contractStats = useMemo(() => {
    const list = contracts?.data || [];
    return {
      pending: list.filter((c) => c.status === "Sent").length,
      accepted: list.filter((c) => c.status === "Accepted").length,
      recentlyAccepted: list
        .filter((c) => c.status === "Accepted" && c.accepted_at)
        .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at))
        .slice(0, 4),
    };
  }, [contracts]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map(STATUS_OPTIONS.map((s) => [s.value, 0]));
    for (const t of tasks) {
      const bucket = STATUS_OPTIONS.find((s) => s.value.toLowerCase() === String(t.task_status || "").toLowerCase());
      if (bucket) counts.set(bucket.value, counts.get(bucket.value) + 1);
    }
    return STATUS_OPTIONS.map((s) => ({ ...s, count: counts.get(s.value) || 0 })).filter((s) => s.count > 0);
  }, [tasks]);

  const focusTasks = buckets[focus] || [];

  return (
    <div className="pb-10">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle={
          buckets.overdue.length > 0
            ? `You have ${buckets.overdue.length} overdue task${buckets.overdue.length === 1 ? "" : "s"} — worth a look first.`
            : buckets.dueToday.length > 0
            ? `${buckets.dueToday.length} task${buckets.dueToday.length === 1 ? "" : "s"} due today. You've got this.`
            : "You're all caught up on deadlines. Nice work."
        }
        actions={<Button icon="solar:add-circle-bold" onClick={() => setQuickCreateOpen(true)}>New task</Button>}
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        {/* Headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Today"
            value={formatDuration(todaySeconds)}
            sub={`${formatDuration(weekSeconds)} this week`}
            icon="solar:clock-circle-bold-duotone"
            color="#6d5ef8"
            loading={sessionsLoading}
            onClick={() => navigate("/work-diary")}
            delay={0}
          />
          <StatCard
            label="Open tasks"
            value={buckets.open.length}
            sub={`${buckets.completed.length} completed`}
            icon="solar:checklist-minimalistic-bold-duotone"
            color="#3b82f6"
            loading={tasksLoading}
            onClick={() => { setFocus("open"); }}
            active={focus === "open"}
            delay={0.04}
          />
          <StatCard
            label="Overdue"
            value={buckets.overdue.length}
            sub={buckets.overdue.length ? "Needs attention" : "All clear"}
            icon="solar:danger-triangle-bold"
            color="#ef4444"
            loading={tasksLoading}
            onClick={() => setFocus("overdue")}
            active={focus === "overdue"}
            delay={0.08}
          />
          <StatCard
            label="My jobs"
            value={jobs.length}
            sub={`${buckets.urgent.length} urgent task${buckets.urgent.length === 1 ? "" : "s"}`}
            icon="solar:folder-bold-duotone"
            color="#10b981"
            loading={tasksLoading}
            onClick={() => navigate("/jobs")}
            delay={0.12}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: focus list + week chart */}
          <div className="lg:col-span-2 space-y-5">
            {/* Focus filters */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mr-1">Focus</span>
                {FOCUS_FILTERS.map((f) => {
                  const count = buckets[f.key]?.length || 0;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFocus(f.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                        focus === f.key
                          ? "border-transparent text-white"
                          : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:border-[var(--line-strong)]"
                      )}
                      style={focus === f.key ? { background: f.color } : undefined}
                    >
                      <Icon icon={f.icon} className="text-[12px]" />
                      {f.label}
                      <span className={cn("tabular-nums", focus === f.key ? "text-white/80" : "text-[var(--ink-tertiary)]")}>{count}</span>
                    </button>
                  );
                })}
              </div>

              <TaskListCard
                title={FOCUS_FILTERS.find((f) => f.key === focus)?.label || "Tasks"}
                icon={FOCUS_FILTERS.find((f) => f.key === focus)?.icon}
                accent={FOCUS_FILTERS.find((f) => f.key === focus)?.color}
                tasks={focusTasks}
                max={8}
                emptyText={focus === "overdue" ? "Nothing overdue — great work. 🎉" : "Nothing here right now."}
                action={{ label: "Open Jobs", onClick: () => navigate("/jobs") }}
              />
            </div>

            {/* Week activity */}
            <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-primary-500/15 flex items-center justify-center">
                    <Icon icon="solar:chart-square-bold-duotone" className="text-[13px] text-primary-500" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--ink-primary)]">Hours this week</span>
                </div>
                <span className="text-xs text-[var(--ink-tertiary)]">{formatDuration(weekSeconds)} total</span>
              </div>
              {sessionsLoading ? <div className="skeleton h-40 rounded-xl" /> : <WeekActivityChart series={weekSeries} />}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-5">
            {isManagerish && <TeamPanel members={team} isLoading={teamLoading} />}

            {canSeeContracts && (
              <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
                  <span className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center flex-none">
                    <Icon icon="solar:file-check-bold-duotone" className="text-[13px] text-amber-500" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Contracts</span>
                  <button onClick={() => navigate("/contracts")} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">View all</button>
                </div>
                <div className="grid grid-cols-2 divide-x divide-[var(--line-subtle)] border-b border-[var(--line-subtle)]">
                  <div className="p-3 text-center">
                    <p className="text-xl font-bold text-amber-500">{contractStats.pending}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">Awaiting signature</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-xl font-bold text-emerald-500">{contractStats.accepted}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">Accepted</p>
                  </div>
                </div>
                {contractStats.recentlyAccepted.length > 0 && (
                  <div className="divide-y divide-[var(--line-subtle)]">
                    {contractStats.recentlyAccepted.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 px-4 py-2">
                        <Icon icon="solar:check-circle-bold" className="text-[14px] text-emerald-500 flex-none" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-medium text-[var(--ink-primary)] truncate">{c.recipient_name}</span>
                          <span className="block text-[10px] text-[var(--ink-tertiary)]">Accepted {formatDate(c.accepted_at)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status mix */}
            {statusBreakdown.length > 0 && (
              <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
                <span className="text-sm font-semibold text-[var(--ink-primary)] block mb-3">My task mix</span>
                <div className="space-y-2">
                  {statusBreakdown.map((s) => {
                    const pct = tasks.length ? (s.count / tasks.length) * 100 : 0;
                    return (
                      <div key={s.value} className="flex items-center gap-2.5">
                        <span className="w-24 flex-none text-[11px] text-[var(--ink-secondary)] truncate">{s.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full" style={{ background: s.color }} />
                        </div>
                        <span className="w-5 text-right text-[11px] font-semibold text-[var(--ink-primary)]">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaves */}
            <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--ink-primary)]">My leaves</span>
                <button onClick={() => navigate("/my-leaves")} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">Manage</button>
              </div>
              {leaves.length === 0 ? (
                <p className="text-xs text-[var(--ink-tertiary)]">No leave requests yet.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xl font-bold text-[var(--ink-primary)]">{leaves.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">Total</p>
                  </div>
                  {pendingLeaves.length > 0 && (
                    <Badge tone="warning">{pendingLeaves.length} pending</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDashboardPage;
