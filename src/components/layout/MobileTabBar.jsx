import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { useAuth } from "@/auth/AuthContext";
import { mobileTabsForRole } from "@/lib/nav";
import { cn } from "@/lib/cn";

/** Bottom tab bar — the primary mobile nav, styled to feel like a native app. */
const MobileTabBar = () => {
  const { user } = useAuth();
  const tabs = mobileTabsForRole(user?.role);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface-raised)]/95 backdrop-blur-md border-t border-[var(--line-subtle)] pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.link}
            to={tab.link}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-active"
                    className="absolute top-1.5 w-8 h-8 rounded-full bg-primary-500/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  icon={tab.icon}
                  className={cn("text-[21px] relative z-10", isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--ink-tertiary)]")}
                />
                <span className={cn("relative z-10", isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--ink-tertiary)]")}>
                  {tab.title}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;
