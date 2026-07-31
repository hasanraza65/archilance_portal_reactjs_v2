import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchSelect from "@/components/ui/SearchSelect";
import EmptyState from "@/components/ui/EmptyState";
import { useContracts, useTemplates, useDeleteContract, useDeleteTemplate, useUpdateContractStatus, useResendContract } from "./useContractsData";
import { CONTRACT_STATUSES, statusTone } from "./contractUtils";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import { cn } from "@/lib/cn";

const ContractsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("contracts");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  const { data: contractsData, isLoading: contractsLoading } = useContracts({ page, per_page: 15, status: status || undefined });
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const deleteContractMut = useDeleteContract();
  const deleteTemplateMut = useDeleteTemplate();
  const updateStatus = useUpdateContractStatus();
  const resend = useResendContract();

  const contracts = contractsData?.data || [];

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied.");
    } catch {
      window.prompt("Copy this contract link:", url);
    }
  };

  const handleResend = async (id) => {
    setResendingId(id);
    try {
      await resend.mutateAsync(id);
      toast.success("Contract re-sent.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to resend."));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader
        title="Contracts"
        subtitle="Create templates, send employment contracts, and track acceptances."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="solar:document-add-linear" onClick={() => navigate("/contracts/templates/new")}>New Template</Button>
            <Button icon="solar:plain-2-bold" onClick={() => navigate("/contracts/send")}>Send Contract</Button>
          </div>
        }
        tabs={
          <div className="flex gap-1 -mb-px">
            {[{ key: "contracts", label: "Sent Contracts", icon: "solar:inbox-in-linear" }, { key: "templates", label: "Templates", icon: "solar:document-text-linear" }].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                )}
              >
                <Icon icon={t.icon} className="text-[15px]" /> {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5">
        {tab === "contracts" ? (
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-[var(--line-subtle)]">
              <div className="w-48">
                <SearchSelect
                  size="sm"
                  options={CONTRACT_STATUSES.map((s) => ({ value: s, label: s }))}
                  value={status}
                  onChange={(v) => { setStatus(v || ""); setPage(1); }}
                  placeholder="All statuses"
                  searchPlaceholder="Filter status…"
                  clearable
                />
              </div>
            </div>

            {contractsLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : contracts.length === 0 ? (
              <EmptyState icon="solar:document-linear" title="No contracts yet" description="Click Send Contract to create the first one." />
            ) : (
              <div className="divide-y divide-[var(--line-subtle)]">
                {contracts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ink-primary)]">{c.recipient_name || c.recipient?.name}</p>
                      <p className="text-xs text-[var(--ink-tertiary)]">{c.recipient_email || c.recipient?.email} · {c.title}</p>
                    </div>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    <span className="text-xs text-[var(--ink-tertiary)] w-24 text-right">{formatDate(c.sent_at || c.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <IconButton icon="solar:eye-linear" size="sm" label="Open public view" onClick={() => window.open(c.public_url, "_blank", "noopener")} />
                      <IconButton icon="solar:link-linear" size="sm" label="Copy link" onClick={() => copyLink(c.public_url)} />
                      <IconButton icon={resendingId === c.id ? "solar:refresh-bold" : "solar:refresh-linear"} size="sm" label="Resend" onClick={() => handleResend(c.id)} disabled={resendingId === c.id} />
                      <IconButton icon="solar:tuning-2-linear" size="sm" label="Change status" onClick={() => setStatusTarget(c)} />
                      <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" label="Delete" onClick={() => setDeleteTarget({ type: "contract", id: c.id, name: c.title })} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {contractsData?.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line-subtle)]">
                <span className="text-xs text-[var(--ink-tertiary)]">{contractsData.total} total</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Prev</button>
                  <button disabled={page >= contractsData.last_page} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--line-subtle)] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        ) : templatesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
        ) : !templates?.length ? (
          <EmptyState icon="solar:document-text-linear" title="No templates yet" description="Create your first contract template." action={<Button icon="solar:add-circle-bold" onClick={() => navigate("/contracts/templates/new")}>New Template</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-10 h-10 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-none">
                    <Icon icon="solar:document-text-linear" className="text-xl" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--ink-primary)] truncate leading-snug" title={t.title}>{t.title}</h3>
                    <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">Updated {formatDate(t.updated_at)}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" icon="solar:plain-2-bold" onClick={() => navigate(`/contracts/send?template=${t.id}`)}>Send</Button>
                  <Button size="sm" variant="secondary" icon="solar:pen-linear" onClick={() => navigate(`/contracts/templates/${t.id}/edit`)}>Edit</Button>
                  <IconButton icon="solar:trash-bin-trash-linear" size="sm" variant="danger" className="ml-auto" label="Delete" onClick={() => setDeleteTarget({ type: "template", id: t.id, name: t.title })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} title="Change contract status" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)] mb-4">{statusTarget?.recipient_name} — {statusTarget?.title}</p>
        <div className="space-y-2">
          {CONTRACT_STATUSES.map((s) => (
            <button
              key={s}
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: statusTarget.id, status: s }, { onSuccess: () => setStatusTarget(null) })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
                statusTarget?.status === s ? "border-primary-400 bg-primary-50 dark:bg-primary-500/10" : "border-[var(--line-subtle)] hover:bg-[var(--surface-sunken)]"
              )}
            >
              <span className="flex items-center gap-2">
                <Badge tone={statusTone(s)}>{s}</Badge>
                {s === "Accepted" && <span className="text-xs text-[var(--ink-tertiary)]">Unlocks the employee's login</span>}
              </span>
              {statusTarget?.status === s && <Icon icon="solar:check-circle-bold" className="text-primary-500" />}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete this?" className="max-w-sm">
        <p className="text-sm text-[var(--ink-secondary)] mb-4">"{deleteTarget?.name}" will be permanently removed.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (deleteTarget.type === "contract") await deleteContractMut.mutateAsync(deleteTarget.id);
              else await deleteTemplateMut.mutateAsync(deleteTarget.id);
              toast.success("Deleted.");
              setDeleteTarget(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ContractsPage;
