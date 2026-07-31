import React, { useState } from "react";
import VersionSwitcher from "./VersionSwitcher";
import OnboardingTour from "./OnboardingTour";
import { CLASSIC_BASE, switchUrl, canUseVersionSwitch, setVersionChoice } from "./versionPrefs";
import { v2ToClassic } from "./routeMap";
import { useAuth } from "@/auth/AuthContext";

/**
 * Topbar control for the NEW app: switch back to classic, or replay the tour.
 *
 * The path is stripped of the /v2 prefix before mapping, because the router's
 * basename means `location.pathname` still carries it.
 */
const VersionSwitchV2 = ({ compact = false }) => {
  const { user } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);

  if (!canUseVersionSwitch(user?.role)) return null;

  const switchToClassic = () => {
    setVersionChoice("classic");
    const stripped = window.location.pathname.replace(/^\/v2/, "") || "/";
    window.location.href = switchUrl(CLASSIC_BASE, v2ToClassic(stripped));
  };

  return (
    <>
      <VersionSwitcher
        side="v2"
        compact={compact}
        onSwitch={switchToClassic}
        onOpenTour={() => setTourOpen(true)}
      />
      <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} showChooseCta={false} />
    </>
  );
};

export default VersionSwitchV2;
