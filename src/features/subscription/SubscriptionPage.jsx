import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import {
  fetchActiveSubscription, fetchBillingDetails, createBillingDetail, updateBillingDetail, deleteBillingDetail,
  fetchPaymentMethods, setDefaultPaymentMethod, deletePaymentMethod,
} from "@/api/subscription";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";

const BRAND_ICON = {
  visa: "logos:visa", mastercard: "logos:mastercard", amex: "logos:amex",
};

const SubscriptionPage = () => {
  const qc = useQueryClient();
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);

  const { data: subRes, isLoading: subLoading } = useQuery({
    queryKey: ["subscription-active"],
    queryFn: () => fetchActiveSubscription().then((r) => r.data).catch((err) => (err.response?.status === 404 ? null : Promise.reject(err))),
  });

  const { data: billingRes } = useQuery({ queryKey: ["billing-details"], queryFn: () => fetchBillingDetails().then((r) => r.data) });
  const billingList = billingRes?.billing_details || (billingRes?.billing_detail ? [billingRes.billing_detail] : []);

  const { data: cards = [] } = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetchPaymentMethods().then((r) => r.data || []) });

  const setDefaultMut = useMutation({
    mutationFn: setDefaultPaymentMethod,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Default card updated."); },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't set default card.")),
  });
  const deleteCardMut = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Card removed."); },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't remove card.")),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  useEffect(() => {
    if (billingModalOpen) {
      reset(editingBilling || { first_name: "", last_name: "", email: "", phone: "", company: "", address: "", city: "", state: "", zip: "", country: "" });
    }
  }, [billingModalOpen, editingBilling]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBilling = useMutation({
    mutationFn: (data) => (editingBilling ? updateBillingDetail(editingBilling.id, data) : createBillingDetail(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-details"] }); toast.success("Billing details saved."); setBillingModalOpen(false); },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't save billing details.")),
  });
  const deleteBillingMut = useMutation({
    mutationFn: deleteBillingDetail,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-details"] }); toast.success("Billing detail removed."); },
  });

  return (
    <div className="pb-10 max-w-3xl">
      <PageHeader title="Subscription" subtitle="Your plan, billing details, and saved payment methods." />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 space-y-6">
        {/* Active plan */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-3">Current Plan</p>
          {subLoading ? (
            <div className="skeleton h-16 rounded-xl" />
          ) : !subRes?.plan ? (
            <EmptyState icon="solar:wallet-money-linear" title="No active subscription" description="You don't currently have an active plan." className="py-8" />
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--ink-primary)]">{subRes.plan.name}</span>
                  <Badge tone="success">Active</Badge>
                </div>
                <p className="text-sm text-[var(--ink-secondary)] mt-1">
                  ${(subRes.plan.price / 100).toFixed(2)} / {subRes.plan.interval}
                </p>
                {subRes.subscription?.ends_at && (
                  <p className="text-xs text-[var(--ink-tertiary)] mt-1">Renews / ends {formatDate(subRes.subscription.ends_at)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Billing details */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--ink-primary)]">Billing Details</p>
            <Button size="sm" variant="secondary" icon="solar:add-circle-linear" onClick={() => { setEditingBilling(null); setBillingModalOpen(true); }}>Add</Button>
          </div>
          {billingList.length === 0 ? (
            <p className="text-xs text-[var(--ink-tertiary)]">No billing details saved yet.</p>
          ) : (
            <div className="space-y-2">
              {billingList.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--surface-sunken)]">
                  <div className="text-sm">
                    <span className="font-medium text-[var(--ink-primary)]">{b.first_name} {b.last_name}</span>
                    <span className="text-[var(--ink-tertiary)]"> · {b.address}, {b.city}, {b.country}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton icon="solar:pen-linear" size="sm" label="Edit" onClick={() => { setEditingBilling(b); setBillingModalOpen(true); }} />
                    <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Delete" onClick={() => deleteBillingMut.mutate(b.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-3">Payment Methods</p>
          {cards.length === 0 ? (
            <p className="text-xs text-[var(--ink-tertiary)]">No saved cards.</p>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--surface-sunken)]">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Icon icon="solar:card-bold-duotone" className="text-[var(--ink-secondary)] text-lg" />
                    <span className="capitalize font-medium text-[var(--ink-primary)]">{c.brand}</span>
                    <span className="text-[var(--ink-tertiary)]">•••• {c.last4} · {c.exp_month}/{c.exp_year}</span>
                    {c.is_default && <Badge tone="primary">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!c.is_default && (
                      <button onClick={() => setDefaultMut.mutate(c.id)} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline px-2">Set default</button>
                    )}
                    <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Remove" onClick={() => deleteCardMut.mutate(c.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={billingModalOpen} onClose={() => setBillingModalOpen(false)} title={editingBilling ? "Edit Billing Details" : "Add Billing Details"} className="max-w-lg">
        <form onSubmit={handleSubmit((d) => saveBilling.mutate(d))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input {...register("first_name", { required: true })} placeholder="First name" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
            <input {...register("last_name", { required: true })} placeholder="Last name" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input {...register("email")} type="email" placeholder="Email" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
            <input {...register("phone")} placeholder="Phone" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <input {...register("company")} placeholder="Company (optional)" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          <input {...register("address", { required: true })} placeholder="Address" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <input {...register("city", { required: true })} placeholder="City" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
            <input {...register("state")} placeholder="State" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
            <input {...register("zip")} placeholder="ZIP" className="h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          </div>
          <input {...register("country", { required: true })} placeholder="Country" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBillingModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting || saveBilling.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;
