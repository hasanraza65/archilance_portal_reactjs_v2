import { useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "@/api/employees";
import { useAuth } from "@/auth/AuthContext";

export function useEmployeesList({ page, perPage, search, employeeType }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employees", user?.role, page, perPage, search, employeeType],
    queryFn: () => fetchEmployees(user.role, { page, perPage, search, employeeType }),
    enabled: Boolean(user),
    placeholderData: (prev) => prev,
  });
}
