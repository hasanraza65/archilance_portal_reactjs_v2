import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileTabBar from "./MobileTabBar";
import MobileDrawer from "./MobileDrawer";
import CommandPalette from "./CommandPalette";
import QuickCreateModal from "./QuickCreateModal";
import ForcePasswordChange from "@/auth/ForcePasswordChange";
import AssistantWidget from "@/features/assistant/AssistantWidget";

const AppShell = () => {
  const location = useLocation();

  // Animate between top-level SECTIONS only. Keying on the full pathname made
  // every in-section navigation (picking a chat contact, opening a job, opening
  // a task) unmount and remount the whole page — which is what caused the
  // messenger to blank out and reload its contact list on each contact click.
  const sectionKey = location.pathname.split("/")[1] || "root";

  return (
    <div className="flex min-h-screen bg-[var(--surface-app)]">
      <Sidebar />
      <MobileDrawer />
      <CommandPalette />
      <QuickCreateModal />
      <ForcePasswordChange />
      <AssistantWidget />

      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <Topbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={sectionKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 min-w-0"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default AppShell;
