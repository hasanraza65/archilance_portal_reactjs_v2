import { useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "@/api/employees";
import { useAuth } from "@/auth/AuthContext";

/** Full employee roster for pickers (assignee select, employee picker, etc). */
export function useAllEmployees() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employees-all", user?.role],
    queryFn: () => fetchEmployees(user.role, { page: 1, perPage: 500 }),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    select: (data) => data.items,
  });
}
