import { apiPrefixForRole } from "@/lib/roles";

/** Builds `/api/{admin|employee|customer|member}{path}` for the given app role. */
export function ep(role, path) {
  const prefix = apiPrefixForRole(role);
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/api/${prefix}${clean}`;
}
