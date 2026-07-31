import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyWorkSessions, fetchEmployeeWorkSessions, deleteWorkSession, deleteScreenshot } from "@/api/workSessions";
import { useAuth } from "@/auth/AuthContext";

function parseDurationString(str) {
  if (!str) return 0;
  const h = /(\d+)h/.exec(str);
  const m = /(\d+)m/.exec(str);
  return (h ? parseInt(h[1], 10) * 3600 : 0) + (m ? parseInt(m[1], 10) * 60 : 0);
}

export function useMyWorkSessions({ startDate, endDate, projectId, taskId }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-work-sessions", user?.role, startDate, endDate, projectId, taskId],
    queryFn: () => fetchMyWorkSessions(user.role, { startDate, endDate, projectId, taskId, page: 1 }),
    enabled: Boolean(user),
  });
  return {
    ...query,
    sessions: query.data?.data || [],
    overallTotalSeconds: parseDurationString(query.data?.overall_total_time),
    windowsActivity: query.data?.windows_activity || [],
  };
}

export function useEmployeeWorkSessionsQuery(employeeId, { startDate, endDate, projectId, taskId } = {}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["employee-work-sessions", user?.role, employeeId, startDate, endDate, projectId, taskId],
    queryFn: () =>
      fetchEmployeeWorkSessions(user.role, employeeId, { startDate, endDate, projectId, taskId, perPage: 200 }),
    enabled: Boolean(user) && Boolean(employeeId),
    placeholderData: (prev) => prev,
  });
  return {
    ...query,
    sessions: query.data?.data || [],
    overallTotalSeconds: parseDurationString(query.data?.overall_total_time),
    windowsActivity: query.data?.windows_activity || [],
  };
}

export function useDeleteWorkSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteWorkSession(user.role, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-work-sessions"] }),
  });
}

export function useDeleteScreenshot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteScreenshot(user.role, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-work-sessions"] }),
  });
}

/** Merge overlapping idle intervals so total idle seconds are never double-counted. */
export function idleSecondsForSession(session) {
  const intervals = (session.idle_times || [])
    .map((i) => [new Date(i.start_time).getTime(), new Date(i.end_time).getTime()])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let curStart = null;
  let curEnd = null;
  for (const [s, e] of intervals) {
    if (curStart === null) {
      [curStart, curEnd] = [s, e];
    } else if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      total += (curEnd - curStart) / 1000;
      [curStart, curEnd] = [s, e];
    }
  }
  if (curStart !== null) total += (curEnd - curStart) / 1000;
  return total;
}

export function sessionWorkedSeconds(session) {
  if (session.raw_calculation?.net_seconds != null) return Math.max(0, session.raw_calculation.net_seconds);
  return 0;
}
