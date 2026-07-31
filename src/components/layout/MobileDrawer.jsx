import React from "react";
import { NavLink } from "react-router-dom";
import { Dialog, DialogPanel } from "@headlessui/react";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/auth/AuthContext";
import { useUI } from "@/store/UIContext";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { getMediaUrl } from "@/api/media";
import { cn } from "@/lib/cn";

/** Full nav drawer for mobile/tablet — everything Sidebar shows, in a sheet. */
const MobileDrawer = () => {
  const { mobileNavOpen, setMobileNavOpen, theme, toggleTheme } = useUI();
  const { user, logout } = useAuth();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(user?.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} transition className="relative z-50 lg:hidden">
      <div className="fixed inset-0 bg-[var(--surface-overlay)] transition duration-200 data-[closed]:opacity-0" />
      <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw]">
        <DialogPanel
          transition
          className="w-full h-full bg-[var(--surface-raised)] flex flex-col transition duration-200 ease-out data-[closed]:-translate-x-full"
        >
          <div className="flex items-center gap-2.5 px-4 h-16 flex-none border-b border-[var(--line-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold">A</div>
            <span className="font-semibold text-[var(--ink-primary)]">Archilance</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
            {groups.map((group, gi) => (
              <div key={gi} className="space-y-1">
                {group.label && (
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-tertiary)]">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => (
                  <NavLink
                    key={item.link}
                    to={item.link}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium",
                        isActive ? "bg-primary-500/10 text-primary-600 dark:text-primary-400" : "text-[var(--ink-secondary)]"
                      )
                    }
                  >
                    <Icon icon={item.icon} className="text-[19px] flex-none" />
                    {item.title}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="flex-none border-t border-[var(--line-subtle)] p-3 space-y-1">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-[var(--ink-secondary)]">
              <Icon icon={theme === "dark" ? "solar:sun-bold-duotone" : "solar:moon-stars-bold-duotone"} className="text-[19px]" />
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <NavLink
              to="/profile"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[var(--surface-sunken)]"
            >
              <Avatar name={user?.name} src={user?.profile_pic ? getMediaUrl(user.profile_pic) : null} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{user?.name}</span>
                <span className="block text-[11px] text-[var(--ink-tertiary)] capitalize">{user?.role}</span>
              </span>
            </NavLink>
            <button onClick={logout} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-danger-500">
              <Icon icon="solar:logout-3-bold-duotone" className="text-[19px]" />
              Log out
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default MobileDrawer;
