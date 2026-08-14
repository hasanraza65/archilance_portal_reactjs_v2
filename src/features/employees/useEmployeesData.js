import { useQuery } from "@tanstack/react-query";
import { fetchEmployees, fetchAllEmployees } from "@/api/employees";
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

/**
 * Every employee, across all pages — for flows where a missing person is a
 * correctness bug rather than a cosmetic one (the bulk diary export). Kept
 * separate from useAllEmployees so the ordinary pickers keep their single,
 * cheap request.
 */
export function useCompleteEmployeeRoster() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employees-complete", user?.role],
    queryFn: () => fetchAllEmployees(user.role),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });
}
