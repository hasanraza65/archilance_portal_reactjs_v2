import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { fetchAllCustomerTeams, deleteAnyCustomerTeamMember } from "@/api/customerTeam";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const STATUS_TONE = { active: "success", pending: "warning", inactive: "neutral", blocked: "danger" };

/**
 * Laravel serialises the `teamUser` / `customerUser` relations in snake_case
 * (Model::$snakeAttributes), which is what the classic app reads too. Both
 * spellings are accepted so a change on either side can't blank the list.
 */
const memberOf = (row) => row?.team_user ?? row?.teamUser ?? null;
const customerOf = (row) => row?.customer_user ?? row?.customerUser ?? null;

/**
 * Every customer's team members, across all customers.
 *
 * Paginated 10 per page — that's fixed server-side, so the search box filters
 * the CURRENT page only. It's labelled as such rather than pretending to search
 * everything.
 */
const AllCustomerTeamsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["all-customer-teams", user?.role, page],
    queryFn: () => fetchAllCustomerTeams(user.role, { page }),
    enabled: Boolean(user),
    placeholderData: (prev) => prev,
  });

  const removeMut = useMutation({
    mutationFn: (id) => deleteAnyCustomerTeamMember(user.role, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-customer-teams"] });
      toast.success("Team member removed.");
      setConfirm(null);
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't remove that member.")),
  });

  const rows = data?.items || [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const m = memberOf(r);
      const c = customerOf(r);
      return [m?.name, m?.email, c?.name, c?.email].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  // How many distinct customers are represented on this page.
  const customerCount = useMemo(
    () => new Set(rows.map((r) => r.customer_id ?? customerOf(r)?.id).filter(Boolean)).size,
    [rows]
  );

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-4xl"
        title="Customer Teams"
        subtitle={
          isLoading
            ? "Loading…"
            : `${data?.total ?? 0} member${data?.total === 1 ? "" : "s"} across all customers · ${customerCount} on this page`
        }
        actions={
          <div className="relative w-full sm:w-auto">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter this page…"
              className="pl-9 pr-3 h-10 sm:h-9 w-full sm:w-56 text-[16px] sm:text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="solar:users-group-rounded-linear"
            title="No customer team members"
            description="Customers invite their own colleagues from their Customer Team page."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="solar:magnifer-linear"
            title="Nothing on this page matches"
            description={`No member on page ${data.currentPage} matches "${search}". Try another page or clear the filter.`}
          />
        ) : (
          <div className={cn(
            "rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden transition-opacity",
            isFetching && "opacity-70"
          )}>
            <div className="divide-y divide-[var(--line-subtle)]">
              {visible.map((r) => {
                const member = memberOf(r);
                const owner = customerOf(r);
                const status = String(r.status || "").toLowerCase();
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar
                      name={member?.name}
                      src={member?.profile_pic ? getMediaUrl(member.profile_pic) : null}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                          {member?.name || "Unknown member"}
                        </span>
                        {r.status && <Badge tone={STATUS_TONE[status] || "neutral"} size="sm">{r.status}</Badge>}
                      </div>
                      <p className="text-xs text-[var(--ink-tertiary)] truncate">
                        {member?.email || member?.phone || "No contact details"}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 min-w-0 max-w-[13rem]">
                      <Icon icon="solar:buildings-2-linear" className="text-[14px] text-[var(--ink-tertiary)] flex-none" />
                      <button
                        type="button"
                        onClick={() => owner?.id && navigate(`/customers/${owner.id}`)}
                        className="text-xs text-[var(--ink-secondary)] hover:text-primary-600 dark:hover:text-primary-400 truncate"
                        title={owner?.name}
                      >
                        {owner?.name || "Unknown customer"}
                      </button>
                    </div>

                    <IconButton
                      icon="solar:trash-bin-trash-linear"
                      size="sm"
                      variant="danger"
                      label="Remove member"
                      onClick={() => setConfirm(r)}
                    />
                  </div>
                );
              })}
            </div>

            {data?.lastPage > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line-subtle)]">
                <span className="text-xs text-[var(--ink-tertiary)]">Page {data.currentPage} of {data.lastPage}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
                  <button disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Remove team member?" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)]">
          <strong className="text-[var(--ink-primary)]">{memberOf(confirm)?.name || "This member"}</strong> will lose
          access to {customerOf(confirm)?.name || "their customer"}'s projects immediately.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" isLoading={removeMut.isPending} onClick={() => removeMut.mutate(confirm.id)}>
            Remove member
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AllCustomerTeamsPage;
