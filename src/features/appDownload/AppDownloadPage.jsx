import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import { versions, latestRelease, previousReleases } from "./releases";
import { cn } from "@/lib/cn";

const HIGHLIGHTS = [
  {
    icon: "solar:stopwatch-bold-duotone",
    title: "Automatic time tracking",
    body: "Start a timer against any task and it logs straight to your work diary.",
  },
  {
    icon: "solar:camera-bold",
    title: "Screenshots & activity",
    body: "Periodic captures across all monitors, plus keyboard and mouse activity.",
  },
  {
    icon: "solar:refresh-bold",
    title: "Works offline",
    body: "Keep tracking with no connection — everything syncs once you're back online.",
  },
];

const AppDownloadPage = () => {
  const [expanded, setExpanded] = useState(null);

  if (!latestRelease) {
    return (
      <div className="pb-10">
        <PageHeader
        maxWidth="max-w-4xl" title="Desktop App" />
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
          <EmptyState
            icon="solar:folder-error-linear"
            title="No releases yet"
            description="Release data is unavailable right now. Please check back later."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Desktop App"
        subtitle="The Windows time tracker — download it once, then it keeps itself up to date."
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-4xl mx-auto space-y-6">
        {/* Latest release — the hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="relative rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden"
        >
          <div
            className="absolute inset-x-0 top-0 h-28 opacity-[0.07] pointer-events-none"
            style={{ background: "radial-gradient(60% 100% at 30% 0%, #6d5ef8, transparent 70%)" }}
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <span className="w-14 h-14 rounded-2xl bg-primary-500/12 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-none">
                  <Icon icon="solar:monitor-bold-duotone" className="text-[28px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="success">Latest</Badge>
                    <span className="text-[11px] text-[var(--ink-tertiary)]">Windows · .exe installer</span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--ink-primary)] mt-1.5">
                    Archilance LLC {latestRelease.version}
                  </h2>
                  <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">
                    Released {latestRelease.releaseDate}
                  </p>
                </div>
              </div>

              <a
                href={latestRelease.url}
                download
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary-500 text-white text-[15px] font-semibold shadow-soft hover:bg-primary-600 active:bg-primary-700 transition-colors flex-none"
              >
                <Icon icon="solar:download-minimalistic-bold" className="text-[18px]" />
                Download {latestRelease.version}
              </a>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--line-subtle)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mb-2.5">
                What's new
              </p>
              <ul className="space-y-1.5">
                {latestRelease.releaseNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink-secondary)]">
                    <Icon icon="solar:check-circle-bold" className="text-[14px] text-emerald-500 mt-[3px] flex-none" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* What it does */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4">
              <span className="w-8 h-8 rounded-lg bg-[var(--surface-sunken)] flex items-center justify-center mb-2.5">
                <Icon icon={h.icon} className="text-[16px] text-primary-500" />
              </span>
              <p className="text-sm font-semibold text-[var(--ink-primary)]">{h.title}</p>
              <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>

        {/* Install steps */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-3.5">Installing</p>
          <ol className="space-y-2.5">
            {[
              "Download the installer above and run it.",
              "If Windows shows a SmartScreen warning, choose “More info” → “Run anyway” — the build is unsigned.",
              "Sign in with your portal email and password, the exact same credentials you use here.",
              "Pick a job and task, then hit start. Your hours appear in your work diary right away.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-500/12 text-primary-600 dark:text-primary-400 text-[11px] font-bold flex items-center justify-center flex-none mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-[var(--ink-secondary)]">{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-2.5 mt-4 pt-4 border-t border-[var(--line-subtle)]">
            <Icon icon="solar:magic-stick-3-bold-duotone" className="text-[16px] text-primary-500 mt-0.5 flex-none" />
            <p className="text-xs text-[var(--ink-secondary)]">
              From <strong className="text-[var(--ink-primary)]">3.4.0</strong> onward the app updates itself — you
              only need this page for a first install or a fresh machine.
            </p>
          </div>
        </div>

        {/* History */}
        {previousReleases.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="solar:history-bold-duotone" className="text-[16px] text-[var(--ink-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">Version history</h3>
              <span className="text-[11px] text-[var(--ink-tertiary)]">
                {previousReleases.length} earlier release{previousReleases.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)] overflow-hidden">
              {previousReleases.map((v) => {
                const open = expanded === v.id;
                return (
                  <div key={v.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : v.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-sunken)] transition-colors"
                    >
                      <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-[var(--ink-tertiary)] flex-none"
                      >
                        <Icon icon="solar:alt-arrow-right-bold" className="text-[13px]" />
                      </motion.span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--ink-primary)]">Version {v.version}</p>
                        <p className="text-[11px] text-[var(--ink-tertiary)]">Released {v.releaseDate}</p>
                      </div>
                      {/* Archived deliberately: only the latest build is supported, and older
                          installers no longer match the current API. */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-none",
                          "bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]"
                        )}
                      >
                        <Icon icon="solar:archive-linear" className="text-[12px]" />
                        Archived
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <ul className="px-4 pb-3.5 pl-11 space-y-1.5">
                            {v.releaseNotes.map((note, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[var(--ink-secondary)]">
                                <span className="w-1 h-1 rounded-full bg-[var(--ink-tertiary)] mt-[7px] flex-none" />
                                {note}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[var(--ink-tertiary)] mt-3">
              Older builds are kept for reference only — always install {latestRelease.version} on a new machine.
              {versions.length > 0 && ` ${versions.length} releases total.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDownloadPage;
