import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/api/customers";
import { useAuth } from "@/auth/AuthContext";

export function useCustomers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["customers", user?.role],
    queryFn: () => fetchCustomers(user.role),
    enabled: Boolean(user),
  });
}

export function useCreateCustomer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCustomer(user.role, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateCustomer(user.role, id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteCustomer(user.role, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
