import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import EmptyState from "@/components/ui/EmptyState";
import { htmlToText } from "@/components/ui/RichText";
import { useAuth } from "@/auth/AuthContext";
import { useJobs } from "@/features/jobs/useJobsData";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import { formatDate } from "@/lib/format";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();

  const statusCounts = useMemo(() => {
    const map = new Map(STATUS_OPTIONS.map((s) => [s.value, 0]));
    for (const j of jobs || []) {
      const bucket = STATUS_OPTIONS.find((s) => s.value.toLowerCase() === String(j.status || "").toLowerCase());
      map.set(bucket?.value || STATUS_OPTIONS[0].value, (map.get(bucket?.value || STATUS_OPTIONS[0].value) || 0) + 1);
    }
    return map;
  }, [jobs]);

  const recentJobs = useMemo(
    () => [...(jobs || [])].sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0)).slice(0, 6),
    [jobs]
  );

  const activeCount = (jobs || []).filter((j) => !["completed"].includes(String(j.status || "").toLowerCase())).length;
  const urgentCount = (jobs || []).filter((j) => j.has_urgent).length;

  return (
    <div className="pb-10">
      <PageHeader title={`${greeting()}, ${user?.name?.split(" ")[0] || "there"}`} subtitle="Here's what's happening across your jobs today." />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Jobs", value: jobs?.length ?? "—", icon: "solar:folder-bold-duotone", color: "#6d5ef8" },
            { label: "Active", value: activeCount, icon: "solar:play-circle-bold-duotone", color: "#3b82f6" },
            { label: "Completed", value: statusCounts.get("Completed") || 0, icon: "solar:check-circle-bold-duotone", color: "#10b981" },
            { label: "Urgent", value: urgentCount, icon: "solar:fire-bold-duotone", color: "#ef4444" },
          ].map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${t.color} 15%, transparent)` }}>
                  <Icon icon={t.icon} className="text-[15px]" style={{ color: t.color }} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">{t.label}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">{isLoading ? "—" : t.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Jobs by Status</p>
          <div className="space-y-2.5">
            {STATUS_OPTIONS.map((s) => {
              const count = statusCounts.get(s.value) || 0;
              const pct = jobs?.length ? (count / jobs.length) * 100 : 0;
              return (
                <div key={s.value} className="flex items-center gap-3">
                  <span className="w-28 flex-none text-xs text-[var(--ink-secondary)]">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full" style={{ background: s.color }} />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-[var(--ink-primary)]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent jobs */}
        <div>
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-3">Jobs</p>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <EmptyState icon="solar:folder-open-linear" title="No jobs yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentJobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => navigate(`/jobs/${j.id}`)}
                  className="text-left rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4 hover:shadow-card transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-[var(--ink-primary)] line-clamp-1">{j.project_name}</span>
                    <StatusPill status={j.status} />
                  </div>
                  {/* Descriptions are stored as rich text, so flatten before showing a
                      2-line preview - printing the raw value shows literal tags. */}
                  <p className="text-xs text-[var(--ink-tertiary)] line-clamp-2 mb-2">
                    {htmlToText(j.project_description) || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-[var(--ink-tertiary)]">
                    <span>{j.customer?.name || "—"}</span>
                    {j.due_date && <span>Due {formatDate(j.due_date)}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
