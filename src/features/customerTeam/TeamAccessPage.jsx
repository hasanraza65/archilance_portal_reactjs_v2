import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { fetchMyTeamAccess, updateTeamMemberStatus } from "@/api/customerTeam";
import { getMediaUrl } from "@/api/media";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const STATUS_TONE = { Approved: "success", Rejected: "danger", Pending: "warning" };

const TeamAccessPage = () => {
  const qc = useQueryClient();
  const { data: members, isLoading } = useQuery({ queryKey: ["my-team-access"], queryFn: fetchMyTeamAccess });
  const updateStatus = useMutation({
    mutationFn: ({ teamId, status }) => updateTeamMemberStatus(teamId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-team-access"] }),
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't update status.")),
  });

  return (
    <div className="pb-10">
      <PageHeader title="Team Access" subtitle="Your customer team and any pending access requests." />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : !members?.length ? (
          <EmptyState icon="solar:shield-user-linear" title="No team members" />
        ) : (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)] overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} src={m.team_user?.profile_pic ? getMediaUrl(m.team_user.profile_pic) : null} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--ink-primary)]">{m.name}</span>
                    <Badge tone={STATUS_TONE[m.status] || "neutral"}>{m.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--ink-tertiary)]">{m.email} {m.phone && `· ${m.phone}`}</p>
                </div>
                {m.status === "Pending" && (
                  <div className="flex items-center gap-1.5 flex-none">
                    <button onClick={() => updateStatus.mutate({ teamId: m.id, status: "Approved" })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Approve</button>
                    <button onClick={() => updateStatus.mutate({ teamId: m.id, status: "Rejected" })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAccessPage;
