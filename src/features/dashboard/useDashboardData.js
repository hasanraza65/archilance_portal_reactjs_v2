import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek } from "date-fns";
import { apiClient } from "@/api/client";
import { fetchProjects, fetchJobRootTasks } from "@/api/projects";
import { fetchMyWorkSessions } from "@/api/workSessions";
import { fetchEmployees } from "@/api/employees";
import { fetchMyLeaveRequests } from "@/api/leave";
import { fetchContracts } from "@/api/contracts";
import { apiPrefixForRole } from "@/lib/roles";
import { useAuth } from "@/auth/AuthContext";
import { isCompletedStatus } from "@/lib/statusMeta";

const iso = (d) => format(d, "yyyy-MM-dd");

/** Employee-side counters — this endpoint already existed on the backend. */
export function useEmployeeStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee-stats", user?.role],
    queryFn: () => apiClient.get(`/api/${apiPrefixForRole(user.role)}/stats`).then((r) => r.data),
    enabled: Boolean(user) && apiPrefixForRole(user.role) === "employee",
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * My tasks across my jobs. The API has no "all my tasks" route, so this fans
 * out over the user's jobs (already scoped to them server-side) and flattens.
 */
export function useMyTasks({ maxJobs = 15 } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-tasks-flat", user?.role, maxJobs],
    queryFn: async () => {
      const jobs = await fetchProjects(user.role, {});
      const lists = await Promise.all(
        jobs.slice(0, maxJobs).map((j) =>
          fetchJobRootTasks(user.role, j.id)
            .then((tasks) => tasks.map((t) => ({ ...t, __job: j })))
            .catch(() => [])
        )
      );
      return { jobs, tasks: lists.flat() };
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

/** My work sessions for the current week (hours + activity trend). */
export function useMyWeekSessions() {
  const { user } = useAuth();
  const start = iso(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const end = iso(new Date());
  return useQuery({
    queryKey: ["my-week-sessions", user?.role, start, end],
    queryFn: () => fetchMyWorkSessions(user.role, { startDate: start, endDate: end }),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

/** Team roster with live timer status + today/week hours (managers & admins). */
export function useTeamSnapshot(enabled) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team-snapshot", user?.role],
    queryFn: () => fetchEmployees(user.role, { page: 1, perPage: 200 }),
    enabled: Boolean(user) && enabled,
    staleTime: 60_000,
    select: (data) => data.items,
  });
}

export function useMyLeaves() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-leaves-dash", user?.role],
    queryFn: () => fetchMyLeaveRequests(user.role),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

/** Contracts overview — executives/admins only. */
export function useContractsSnapshot(enabled) {
  return useQuery({
    queryKey: ["contracts-dash"],
    queryFn: () => fetchContracts({ per_page: 100 }).then((r) => r.data),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

/** Buckets my tasks by urgency for the dashboard's headline stats. */
export function useTaskBuckets(tasks = []) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = tasks.filter((t) => !isCompletedStatus(t.task_status));
    const withDue = open.filter((t) => t.due_date);

    const dayDiff = (t) => {
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return Math.round((d - today) / 86400000);
    };

    return {
      all: tasks,
      open,
      completed: tasks.filter((t) => isCompletedStatus(t.task_status)),
      overdue: withDue.filter((t) => dayDiff(t) < 0),
      dueToday: withDue.filter((t) => dayDiff(t) === 0),
      dueThisWeek: withDue.filter((t) => dayDiff(t) >= 0 && dayDiff(t) <= 7),
      urgent: open.filter((t) => String(t.priority || "").toLowerCase() === "urgent"),
      unscheduled: open.filter((t) => !t.due_date),
    };
  }, [tasks]);
}

/** Daily worked-seconds series for the week chart. */
export function useWeekSeries(sessions = []) {
  return useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { key: iso(d), label: format(d, "EEE"), seconds: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const s of sessions) {
      const key = s.start_date;
      const bucket = byKey.get(key);
      if (bucket) bucket.seconds += Math.max(0, s.raw_calculation?.net_seconds || 0);
    }
    return days;
  }, [sessions]);
}
