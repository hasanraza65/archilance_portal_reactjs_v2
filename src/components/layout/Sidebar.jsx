import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/auth/AuthContext";
import { useUI } from "@/store/UIContext";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Avatar from "@/components/ui/Avatar";
import Tooltip from "@/components/ui/Tooltip";
import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

const NavItem = ({ item, collapsed }) => {
  const link = (
    <NavLink
      to={item.link}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150",
          collapsed && "justify-center px-0 w-11 h-11 mx-auto",
          isActive
            ? "text-primary-700 dark:text-primary-300"
            : "text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-xl bg-primary-500/10 dark:bg-primary-500/15"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          {isActive && !collapsed && (
            <motion.span
              layoutId="sidebar-active-bar"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary-500"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <Icon
            icon={item.icon}
            className={cn("text-[17px] flex-none relative z-10", isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--ink-tertiary)] group-hover:text-[var(--ink-secondary)]")}
          />
          {!collapsed && <span className="truncate relative z-10">{item.title}</span>}
        </>
      )}
    </NavLink>
  );

  return collapsed ? (
    <Tooltip content={item.title} side="top">
      {link}
    </Tooltip>
  ) : (
    link
  );
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUI();
  const navigate = useNavigate();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(user?.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--line-subtle)] bg-[var(--surface-raised)] transition-[width] duration-200 flex-none",
        sidebarCollapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-2.5 h-16 flex-none border-b border-[var(--line-subtle)]", sidebarCollapsed ? "justify-center px-0" : "px-4")}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-none shadow-soft">
          A
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-[15px] text-[var(--ink-primary)] tracking-tight">Archilance</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3 space-y-5">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && !sidebarCollapsed && (
              <div className="px-3 pt-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-tertiary)]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavItem key={item.link} item={item} collapsed={sidebarCollapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: theme toggle, collapse, user */}
      <div className="flex-none border-t border-[var(--line-subtle)] p-2.5 space-y-0.5">
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)] transition-colors",
            sidebarCollapsed && "justify-center px-0 w-11 h-11 mx-auto"
          )}
        >
          <Icon icon={theme === "dark" ? "solar:sun-bold-duotone" : "solar:moon-stars-bold-duotone"} className="text-[17px] flex-none text-[var(--ink-tertiary)]" />
          {!sidebarCollapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[var(--surface-sunken)] transition-colors mt-1",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <Avatar name={user?.name} src={user?.profile_pic ? getMediaUrl(user.profile_pic) : null} size="sm" ring />
          {!sidebarCollapsed && (
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-[13.5px] font-semibold text-[var(--ink-primary)] truncate">{user?.name}</span>
              <span className="block text-[11px] text-[var(--ink-tertiary)] capitalize truncate">{user?.role}</span>
            </span>
          )}
        </button>

        <div className={cn("flex mt-1", sidebarCollapsed ? "flex-col items-center gap-1" : "items-center justify-between px-1")}>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-tertiary)] hover:text-danger-500 transition-colors px-1.5 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Icon icon="solar:logout-3-bold-duotone" className="text-[14px]" />
              Log out
            </button>
          )}
          <IconButton
            icon={sidebarCollapsed ? "solar:double-alt-arrow-right-linear" : "solar:double-alt-arrow-left-linear"}
            size="sm"
            label={sidebarCollapsed ? "Expand" : "Collapse"}
            onClick={toggleSidebar}
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
