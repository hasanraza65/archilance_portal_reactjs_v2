import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { homeRouteForRole } from "@/lib/nav";
import FullscreenLoader from "@/components/layout/FullscreenLoader";

const RootRedirect = () => {
  const { isAuthenticated, user, booting } = useAuth();
  if (booting) return <FullscreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={homeRouteForRole(user.role)} replace />;
};

export default RootRedirect;
