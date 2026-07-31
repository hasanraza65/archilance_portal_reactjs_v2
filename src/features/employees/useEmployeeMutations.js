import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee, updateEmployee, deleteEmployee, fetchEmployee, updateJoiningDate,
} from "@/api/employees";
import { useAuth } from "@/auth/AuthContext";

/** Every employee list/detail cache, so one write refreshes them all. */
function invalidateEmployees(qc) {
  qc.invalidateQueries({ queryKey: ["employees"] });
  qc.invalidateQueries({ queryKey: ["employees-all"] });
  qc.invalidateQueries({ queryKey: ["employee"] });
}

export function useEmployee(id) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee", user?.role, id],
    queryFn: () => fetchEmployee(user.role, id),
    enabled: Boolean(user && id),
  });
}

export function useCreateEmployee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values) => createEmployee(user.role, values),
    onSuccess: () => invalidateEmployees(qc),
  });
}

export function useUpdateEmployee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...values }) => updateEmployee(user.role, id, values),
    onSuccess: () => invalidateEmployees(qc),
  });
}

export function useDeleteEmployee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteEmployee(user.role, id),
    onSuccess: () => invalidateEmployees(qc),
  });
}

export function useUpdateJoiningDate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, joiningDate }) => updateJoiningDate(user.role, employeeId, joiningDate),
    onSuccess: () => invalidateEmployees(qc),
  });
}
