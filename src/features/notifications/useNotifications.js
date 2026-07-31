import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notifications";
import { useAuth } from "@/auth/AuthContext";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60_000, // light polling — no socket channel for this on the backend
    staleTime: 15_000,
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return {
    notifications: query.data?.notifications || [],
    totalUnread: query.data?.totalUnread || 0,
    isLoading: query.isLoading,
    markAll: markAll.mutate,
    markOne: markOne.mutate,
  };
}
