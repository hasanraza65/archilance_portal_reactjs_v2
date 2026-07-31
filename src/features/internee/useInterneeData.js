import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyInternees, fetchInterneeRatings, createInterneeRating, updateInterneeRating,
} from "@/api/internee";
import { useAuth } from "@/auth/AuthContext";

export function useMyInternees(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-internees", user?.role],
    queryFn: () => fetchMyInternees(user.role),
    enabled: Boolean(user) && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useInterneeRatings(filters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["internee-ratings", user?.role, filters],
    queryFn: () => fetchInterneeRatings(user.role, filters),
    enabled: Boolean(user),
    placeholderData: (prev) => prev,
  });
}

export function useSaveInterneeRating() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      id ? updateInterneeRating(user.role, id, payload) : createInterneeRating(user.role, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internee-ratings"] }),
  });
}
