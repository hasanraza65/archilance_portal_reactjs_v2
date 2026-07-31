import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [theme, setTheme] = useLocalStorage(
    "v2_theme",
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage("v2_sidebar_collapsed", false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [setTheme]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), [setSidebarCollapsed]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      commandPaletteOpen,
      setCommandPaletteOpen,
      quickCreateOpen,
      setQuickCreateOpen,
    }),
    [theme, toggleTheme, sidebarCollapsed, toggleSidebar, mobileNavOpen, commandPaletteOpen, quickCreateOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}
