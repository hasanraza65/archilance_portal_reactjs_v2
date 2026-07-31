import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { fetchCustomerTeam, createCustomerTeamMember, updateCustomerTeamMember, deleteCustomerTeamMember } from "@/api/customerTeam";
import { getMediaUrl } from "@/api/media";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const STATUS_TONE = { Active: "success", Pending: "warning" };

const CustomerTeamPage = () => {
  const qc = useQueryClient();
  const { data: members, isLoading } = useQuery({ queryKey: ["customer-team"], queryFn: fetchCustomerTeam });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (formOpen) reset(editing ? { name: editing.name, email: editing.email, phone: editing.phone } : { name: "", email: "", phone: "" });
  }, [formOpen, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({ mutationFn: createCustomerTeamMember, onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-team"] }) });
  const updateMut = useMutation({ mutationFn: ({ id, ...data }) => updateCustomerTeamMember(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-team"] }) });
  const deleteMut = useMutation({ mutationFn: deleteCustomerTeamMember, onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-team"] }) });

  const onSubmit = async (data) => {
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, ...data });
      else await createMut.mutateAsync(data);
      toast.success(editing ? "Team member updated." : "Team member invited.");
      setFormOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Something went wrong."));
    }
  };

  return (
    <div className="pb-10">
      <PageHeader
        title="Customer Team"
        subtitle="Invite your team members to collaborate on your jobs."
        actions={<Button icon="solar:user-plus-bold" onClick={() => { setEditing(null); setFormOpen(true); }}>Invite Member</Button>}
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : !members?.length ? (
          <EmptyState icon="solar:users-group-rounded-linear" title="No team members yet" description="Invite your first team member." />
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
                <div className="flex items-center gap-1">
                  <IconButton icon="solar:pen-linear" size="sm" label="Edit" onClick={() => { setEditing(m); setFormOpen(true); }} />
                  <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Remove" onClick={() => setDeleteTarget(m)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Team Member" : "Invite Team Member"} className="max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Name</label>
            <input {...register("name", { required: true })} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Email</label>
            <input {...register("email", { required: true })} type="email" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Phone</label>
            <input {...register("phone")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>{editing ? "Save" : "Invite"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Remove this member?" className="max-w-sm">
        <p className="text-sm text-[var(--ink-secondary)] mb-4">"{deleteTarget?.name}" will lose access to your jobs.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteMut.isPending} onClick={async () => { await deleteMut.mutateAsync(deleteTarget.id); toast.success("Removed."); setDeleteTarget(null); }}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerTeamPage;
