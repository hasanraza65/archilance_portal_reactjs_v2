import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyLeaveRequests, fetchMyLeaveEnvelope, fetchLeaveRequests, createLeaveRequest,
  updateLeaveRequest, updateLeaveStatus, deleteLeaveRequest,
} from "@/api/leave";
import { useAuth } from "@/auth/AuthContext";

export function useMyLeaveRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-leave-requests", user?.role],
    queryFn: () => fetchMyLeaveRequests(user.role),
    enabled: Boolean(user),
  });
}

/** Requests + per-type usage + cycle window, for the balance cards. */
export function useMyLeaveEnvelope() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-leave-envelope", user?.role],
    queryFn: () => fetchMyLeaveEnvelope(user.role),
    enabled: Boolean(user),
  });
}

export function useLeaveRequests({ enabled = true, ...filters } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leave-requests", user?.role, filters],
    queryFn: () => fetchLeaveRequests(user.role, filters),
    // `enabled: false` is used when a search matched zero employees — querying
    // with no user_id would wrongly return everyone.
    enabled: Boolean(user) && enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCreateLeaveRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createLeaveRequest(user.role, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      qc.invalidateQueries({ queryKey: ["my-leave-envelope"] });
    },
  });
}

export function useUpdateLeaveRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateLeaveRequest(user.role, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
      qc.invalidateQueries({ queryKey: ["my-leave-envelope"] });
    },
  });
}

export function useUpdateLeaveStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateLeaveStatus(user.role, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      // The detail view carries the reviewer stamp, so it has to refetch too —
      // otherwise the balance modal keeps showing the pre-decision state.
      qc.invalidateQueries({ queryKey: ["leave-detail"] });
    },
  });
}

export function useDeleteLeaveRequest(scope = "admin") {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteLeaveRequest(user.role, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [scope === "admin" ? "leave-requests" : "my-leave-requests"] }),
  });
}
