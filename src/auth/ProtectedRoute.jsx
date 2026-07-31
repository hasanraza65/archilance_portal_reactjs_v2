import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { homeRouteForRole } from "@/lib/nav";
import FullscreenLoader from "@/components/layout/FullscreenLoader";

/**
 * Route guard.
 *
 * A signed-in user who lands on a screen their role can't open is sent to their
 * OWN home, not to /404. A 404 is for a URL that doesn't exist; this one does,
 * it just isn't theirs — and a dead-end is a bad answer either way.
 *
 * This matters most for the version switch: several screens here are role-
 * scoped differently from the classic app (an admin has no personal Work Diary
 * or My Leaves, for instance), so a mapped path can legitimately be off-limits.
 * Bouncing to home keeps that a soft landing instead of a "page not found".
 *
 * `/404` still exists for genuinely unknown URLs via the catch-all route.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, booting } = useAuth();
  const location = useLocation();

  if (booting) return <FullscreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = homeRouteForRole(user.role);
    // Guard against a redirect loop if a role's own home were ever gated
    // against it — better a plain 404 than an infinite bounce.
    if (home === location.pathname) return <Navigate to="/404" replace />;
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;
