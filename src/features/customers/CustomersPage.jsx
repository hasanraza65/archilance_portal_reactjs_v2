import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useCustomers, useDeleteCustomer } from "./useCustomersData";
import CustomerFormModal from "./CustomerFormModal";
import { getMediaUrl } from "@/api/media";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const deleteMut = useDeleteCustomer();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    const list = customers || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <div className="pb-10">
      <PageHeader
        title="Customers"
        subtitle={customers ? `${customers.length} total` : undefined}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" className="pl-9 pr-3 h-10 sm:h-9 w-full sm:w-56 text-[16px] sm:text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
            <Button icon="solar:add-circle-bold" onClick={() => { setEditing(null); setFormOpen(true); }}>Add Customer</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="solar:buildings-2-linear" title="No customers found" description={search ? "Try a different search." : undefined} />
        ) : (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)] overflow-hidden">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-sunken)] transition-colors">
                <Avatar name={c.name} src={c.profile_pic ? getMediaUrl(c.profile_pic) : null} size="md" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[var(--ink-primary)]">{c.name}</span>
                  <p className="text-xs text-[var(--ink-tertiary)] truncate">{c.email || c.phone || "—"}</p>
                </div>
                {c.subscription_from && (
                  <span className="hidden sm:block text-xs text-[var(--ink-tertiary)]">Since {formatDate(c.subscription_from)}</span>
                )}
                <div className="flex items-center gap-1">
                  <IconButton icon="solar:user-circle-bold-duotone" size="sm" label="View customer" onClick={() => navigate(`/customers/${c.id}`)} />
                  <IconButton icon="solar:pen-linear" size="sm" label="Edit" onClick={() => { setEditing(c); setFormOpen(true); }} />
                  <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Delete" onClick={() => setDeleteTarget(c)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete this customer?" className="max-w-sm">
        <p className="text-sm text-[var(--ink-secondary)] mb-4">"{deleteTarget?.name}" will be permanently removed.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteMut.isPending} onClick={async () => { await deleteMut.mutateAsync(deleteTarget.id); toast.success("Customer deleted."); setDeleteTarget(null); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
