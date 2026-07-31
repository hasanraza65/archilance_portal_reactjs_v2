import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTaskDetail } from "@/api/tasks";
import { useAuth } from "@/auth/AuthContext";

export function useTaskDetail(taskId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["task-detail", user?.role, taskId],
    queryFn: () => fetchTaskDetail(user.role, taskId),
    enabled: Boolean(user) && Boolean(taskId),
  });
}

export function useInvalidateTask() {
  const qc = useQueryClient();
  // react-query matches by key PREFIX, so invalidating the base key covers every
  // role/id variant beneath it — no need to reconstruct the exact tuple.
  return () => {
    qc.invalidateQueries({ queryKey: ["task-detail"] });
    qc.invalidateQueries({ queryKey: ["job-root-tasks"] });
    qc.invalidateQueries({ queryKey: ["task-children"] });
  };
}
