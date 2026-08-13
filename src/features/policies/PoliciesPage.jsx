import React, { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/auth/AuthContext";
import { TEAM_OPTIONS } from "@/features/employees/teamOptions";
import { POLICY_META, GENERAL_SECTIONS, TEAM_ADDENDA, BASE_TOTALS } from "./policyContent";
import { canViewPolicies } from "./access";
import { cn } from "@/lib/cn";

// These roles administer leave, so they get a team switcher to preview any
// team's policy instead of only their own. Executive is handled separately
// below — its access depends on whether it has a team assigned, not on a
// manual switcher (see PoliciesPage's access rule comment).
const MANAGE_ROLES = ["admin", "manager", "supervisor"];

const TEAM_TABS = [{ value: "", label: "General" }, ...TEAM_OPTIONS];

const renderBlock = (block, idx) => {
  switch (block.type) {
    case "p":
      return (
        <p key={idx} className="text-sm text-[var(--ink-secondary)] leading-relaxed">
          {block.text}
        </p>
      );
    case "subheading":
      return (
        <p key={idx} className="text-sm font-semibold text-[var(--ink-primary)] pt-1">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul key={idx} className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink-secondary)]">
              <Icon icon="solar:check-circle-bold" className="text-[14px] text-primary-500 mt-0.5 flex-none" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div key={idx} className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--warning-text-strong)] leading-relaxed">{block.text}</p>
        </div>
      );
    case "stat":
      return (
        <p key={idx} className="text-sm font-bold text-[var(--ink-primary)]">
          {block.text}
        </p>
      );
    case "example":
      return (
        <div key={idx} className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2.5 font-mono text-xs text-[var(--ink-secondary)] space-y-0.5">
          {block.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    default:
      return null;
  }
};

// `notes` is a list of { label, text } — one per team addendum that has
// something to say about this section. Almost always 0 or 1 entries; more
// than one only happens in an Executive's "all teams" view.
const PolicySection = ({ section, notes, teamLabel, accent }) => (
  <section
    id={section.id}
    className={cn(
      "rounded-2xl border bg-[var(--surface-raised)] p-5 sm:p-6 scroll-mt-4",
      accent ? "border-primary-500/40" : "border-[var(--line-subtle)]"
    )}
  >
    <div className="flex items-center gap-2 flex-wrap">
      <h2 className="text-base font-bold text-[var(--ink-primary)]">{section.title}</h2>
      {accent && <Badge tone="primary">{teamLabel} only</Badge>}
    </div>
    <div className="mt-3 space-y-3">{section.blocks.map((block, i) => renderBlock(block, i))}</div>
    {notes?.map((n, i) => (
      <div key={i} className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/5 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-1">
          {n.label} note
        </p>
        <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">{n.text}</p>
      </div>
    ))}
  </section>
);

const StatChip = ({ label, value }) => (
  <div className="rounded-xl bg-[var(--surface-sunken)] px-3 py-2.5 text-center">
    <p className="text-lg font-bold text-[var(--ink-primary)]">{value}</p>
    <p className="text-[11px] text-[var(--ink-tertiary)] mt-0.5">{label}</p>
  </div>
);

const PoliciesPage = () => {
  const { user } = useAuth();
  const canManage = MANAGE_ROLES.includes(user?.role);
  const isExecutive = user?.role === "executive";
  const hasOwnTeam = Boolean(user?.employee_team);

  // Access rule for Executive (per employee_type, not the manage-roles
  // switcher above): no team on their employee record = full access to
  // every team's policy at once; a specific team assigned = scoped to just
  // that team's policy, same as any other employee.
  const allTeamsMode = isExecutive && !hasOwnTeam;

  // Admins/managers/supervisors can browse any team's policy via the tab
  // switcher; everyone else (including a team-scoped Executive) always sees
  // the one that applies to them, straight off their own employee record.
  const [manageTeam, setManageTeam] = useState("");
  const selectedTeam = canManage ? manageTeam : user?.employee_team || "";

  // The team addenda in play: one (or none) normally, or every team at once
  // in an Executive's "all teams" view.
  const activeAddenda = useMemo(() => {
    if (allTeamsMode) return Object.entries(TEAM_ADDENDA).map(([key, cfg]) => ({ key, ...cfg }));
    const cfg = TEAM_ADDENDA[selectedTeam];
    return cfg ? [{ key: selectedTeam, ...cfg }] : [];
  }, [allTeamsMode, selectedTeam]);

  const activeLabel = allTeamsMode
    ? "All Teams — Executive Access"
    : selectedTeam
    ? TEAM_OPTIONS.find((t) => t.value === selectedTeam)?.label || selectedTeam
    : "General (All Teams)";

  const totals = useMemo(() => {
    if (allTeamsMode) return BASE_TOTALS; // varies by team — see the breakdown rendered alongside these chips
    const cfg = TEAM_ADDENDA[selectedTeam];
    return {
      ...BASE_TOTALS,
      casual: cfg?.casualTotal ?? BASE_TOTALS.casual,
      total: cfg?.totalLeaveDays ?? BASE_TOTALS.total,
    };
  }, [allTeamsMode, selectedTeam]);

  // Internees, and anyone on Outsource Department / Business Team, aren't
  // covered by this policy at all — see canViewPolicies in ./access.js.
  // Admin/manager/supervisor are exempt so they can still browse any team's
  // policy for management purposes.
  if (!canViewPolicies(user)) {
    return (
      <div className="pb-10">
        <PageHeader title={POLICY_META.title} maxWidth="max-w-3xl" />
        <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto">
          <EmptyState
            icon="solar:shield-cross-linear"
            title="No leave policy applies to you"
            description={
              user?.role === "internee"
                ? "Internees aren't covered by this leave policy — see My Grading for how your track works instead."
                : `${user?.employee_team} isn't covered by this leave policy. Reach out to HR if you think that's wrong.`
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={POLICY_META.title}
        subtitle={`Effective ${POLICY_META.effectiveDate} · Policy Owner: ${POLICY_META.owner}`}
        maxWidth="max-w-3xl"
        tabs={
          canManage && (
            <div className="flex gap-1 -mb-px min-w-max">
              {TEAM_TABS.map((t) => (
                <button
                  key={t.value || "general"}
                  onClick={() => setManageTeam(t.value)}
                  className={cn(
                    "px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex-none",
                    selectedTeam === t.value
                      ? "border-primary-500 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto space-y-4">
        {!canManage && allTeamsMode && (
          <div className="flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
            <Icon icon="solar:shield-star-bold" className="text-[14px] flex-none text-primary-500" />
            <span>
              You're not tied to one team, so as an <strong className="text-[var(--ink-secondary)]">Executive</strong> you
              see every team's policy below.
            </span>
          </div>
        )}

        {!canManage && !isExecutive && selectedTeam && (
          <div className="flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
            <Icon icon="solar:info-circle-linear" className="text-[14px] flex-none" />
            <span>
              Showing the policy that applies to you — <strong className="text-[var(--ink-secondary)]">{activeLabel}</strong>.
            </span>
          </div>
        )}
        {!canManage && isExecutive && !allTeamsMode && (
          <div className="flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
            <Icon icon="solar:info-circle-linear" className="text-[14px] flex-none" />
            <span>
              You're assigned to <strong className="text-[var(--ink-secondary)]">{activeLabel}</strong>, so that team's
              policy is shown below.
            </span>
          </div>
        )}

        {!canManage && !isExecutive && !selectedTeam && (
          <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 flex items-start gap-3">
            <Icon icon="solar:danger-triangle-bold" className="text-[var(--warning-icon)] text-[18px] flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--warning-text-strong)]">You're not added to a team yet</p>
              <p className="text-xs text-[var(--warning-text)] mt-0.5">
                Some leave rules (like the BIM Team's extra Casual Leave days) only apply once your admin adds you to
                a team. Below is the general company policy — check back after you've been added to a team.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mb-3">
            {activeLabel} — Entitlement Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip label="Annual" value={totals.annual} />
            <StatChip label="Casual" value={totals.casual} />
            <StatChip label="Sick" value={totals.sick} />
            <StatChip label="Marriage" value={totals.marriage} />
          </div>
          <p className="text-xs text-[var(--ink-tertiary)] mt-3">
            {totals.total} leave days + {totals.marriage} Marriage Leaves per leave year.
          </p>
          {allTeamsMode && activeAddenda.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--line-subtle)] space-y-1">
              <p className="text-[11px] font-semibold text-[var(--ink-tertiary)]">Team-specific totals</p>
              {activeAddenda.map((a) => (
                <p key={a.key} className="text-xs text-[var(--ink-secondary)]">
                  <strong className="text-[var(--ink-primary)]">{a.label}:</strong>{" "}
                  {a.totalLeaveDays ?? BASE_TOTALS.total} total leave days ({a.casualTotal ?? BASE_TOTALS.casual} Casual)
                </p>
              ))}
            </div>
          )}
        </div>

        {GENERAL_SECTIONS.map((section) => {
          const notes = activeAddenda
            .filter((a) => a.sectionNotes?.[section.id])
            .map((a) => ({ label: a.label, text: a.sectionNotes[section.id] }));
          const extras = activeAddenda.flatMap((a) =>
            (a.extraSections || [])
              .filter((extra) => extra.insertAfter === section.id)
              .map((extra) => ({ ...extra, teamLabel: a.label }))
          );
          return (
            <React.Fragment key={section.id}>
              <PolicySection section={section} notes={notes} />
              {extras.map((extra) => (
                <PolicySection key={extra.id} section={extra} teamLabel={extra.teamLabel} accent />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PoliciesPage;
