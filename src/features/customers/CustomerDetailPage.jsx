import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import CustomerFormModal from "./CustomerFormModal";
import { useCustomers, useDeleteCustomer } from "./useCustomersData";
import { useJobs } from "@/features/jobs/useJobsData";
import { fetchCustomerTeamFor } from "@/api/customerTeam";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { isCompletedStatus } from "@/lib/statusMeta";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const Row = ({ icon, label, value, muted }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon icon={icon} className="text-[15px] text-[var(--ink-tertiary)] mt-0.5 flex-none" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">{label}</p>
      <p className={muted ? "text-sm text-[var(--ink-tertiary)] italic" : "text-sm text-[var(--ink-primary)] font-medium break-words"}>
        {value}
      </p>
    </div>
  </div>
);

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The list endpoint returns every customer, so the row is already cached —
  // no reason to make a second round-trip for the same object.
  const { data: customers = [], isLoading } = useCustomers();
  const customer = useMemo(
    () => customers.find((c) => String(c.id) === String(customerId)),
    [customers, customerId]
  );

  const { data: jobs = [], isLoading: loadingJobs } = useJobs({ customerId });
  const deleteMut = useDeleteCustomer();

  const { data: team } = useQuery({
    queryKey: ["customer-team-for", user?.role, customerId],
    queryFn: () => fetchCustomerTeamFor(user.role, customerId),
    enabled: Boolean(user && customerId),
    staleTime: 60_000,
  });

  const active = jobs.filter((j) => !isCompletedStatus(j.status));

  const remove = async () => {
    try {
      await deleteMut.mutateAsync(customerId);
      toast.success(`${customer?.name || "Customer"} deleted.`);
      navigate("/customers");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't delete this customer."));
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  if (!customer) {
    return (
      <div className="pb-10">
        <PageHeader
        maxWidth="max-w-4xl" title="Customer" />
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
          <EmptyState
            icon="solar:folder-error-linear"
            title="Customer not found"
            description="They may have been deleted, or the link is out of date."
            action={<Button onClick={() => navigate("/customers")}>All customers</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={customer.name}
        subtitle="Customer"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="solar:arrow-left-linear" onClick={() => navigate("/customers")}>
              All customers
            </Button>
            <Button variant="secondary" icon="solar:pen-linear" onClick={() => setEditOpen(true)}>Edit</Button>
            <Button variant="danger" icon="solar:trash-bin-trash-linear" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-4xl mx-auto space-y-4">
        {/* Identity */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar name={customer.name} src={customer.profile_pic ? getMediaUrl(customer.profile_pic) : null} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[var(--ink-primary)]">{customer.name}</h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-0.5">{customer.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge tone="neutral">{jobs.length} job{jobs.length === 1 ? "" : "s"}</Badge>
                {active.length > 0 && <Badge tone="success">{active.length} active</Badge>}
                {team?.items?.length > 0 && (
                  <Badge tone="info">{team.items.length} team member{team.items.length === 1 ? "" : "s"}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contact */}
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--ink-primary)] mb-1">Contact</p>
            <div className="divide-y divide-[var(--line-subtle)]">
              <Row icon="solar:letter-linear" label="Email" value={customer.email || "Not set"} muted={!customer.email} />
              <Row icon="solar:user-circle-bold-duotone" label="Username" value={customer.username || "Not set"} muted={!customer.username} />
              <Row icon="solar:chat-round-dots-linear" label="Phone" value={customer.phone || "Not set"} muted={!customer.phone} />
              <Row
                icon="solar:calendar-linear"
                label="Subscribed from"
                value={customer.subscription_from ? formatDate(customer.subscription_from) : "Not set"}
                muted={!customer.subscription_from}
              />
            </div>
          </div>

          {/* Team */}
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[var(--ink-primary)]">Team members</p>
              <button
                onClick={() => navigate("/customer-teams")}
                className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Manage
              </button>
            </div>
            {!team ? (
              <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            ) : team.items.length === 0 ? (
              <p className="text-xs text-[var(--ink-tertiary)] py-3">
                Nobody yet — this customer invites colleagues from their own Customer Team page.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {team.items.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <Avatar
                      name={(m.team_user ?? m.teamUser)?.name}
                      src={(m.team_user ?? m.teamUser)?.profile_pic ? getMediaUrl((m.team_user ?? m.teamUser).profile_pic) : null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--ink-primary)] truncate">{(m.team_user ?? m.teamUser)?.name || "Unknown"}</p>
                      <p className="text-[11px] text-[var(--ink-tertiary)] truncate">{(m.team_user ?? m.teamUser)?.email}</p>
                    </div>
                    {m.status && <Badge tone="neutral" size="sm">{m.status}</Badge>}
                  </li>
                ))}
              </ul>
            )}
            {team?.truncated && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                Only the first 200 records were scanned — see Customer Teams for the full list.
              </p>
            )}
          </div>
        </div>

        {/* Jobs */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
            <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
              <Icon icon="solar:folder-bold-duotone" className="text-[13px] text-primary-500" />
            </span>
            <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Jobs</span>
            <span className="text-[11px] text-[var(--ink-tertiary)]">{jobs.length}</span>
          </div>

          {loadingJobs ? (
            <div className="p-3 space-y-2">{[1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-[var(--ink-tertiary)] px-4 py-6 text-center">
              No jobs for this customer yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line-subtle)]">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => navigate(`/jobs/${j.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink-primary)] truncate">{j.project_name}</p>
                    <p className="text-[11px] text-[var(--ink-tertiary)]">
                      {j.due_date ? `Due ${formatDate(j.due_date)}` : "No due date"}
                    </p>
                  </div>
                  <StatusPill status={j.status} />
                  <Icon icon="solar:alt-arrow-right-linear" className="text-[14px] text-[var(--ink-tertiary)] flex-none" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete customer?" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)]">
          <strong className="text-[var(--ink-primary)]">{customer.name}</strong> will lose portal access.
          {jobs.length > 0 && (
            <> Their <strong className="text-[var(--ink-primary)]">{jobs.length}</strong> job
            {jobs.length === 1 ? "" : "s"} stay in place and keep their history.</>
          )}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteMut.isPending} onClick={remove}>Delete customer</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetailPage;
