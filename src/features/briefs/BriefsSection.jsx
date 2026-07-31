import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import FilePicker from "@/components/ui/FilePicker";
import AttachmentList from "@/components/ui/AttachmentList";
import DateField from "@/components/ui/DateField";
import { Field, TextArea } from "@/components/ui/Field";
import RichText, { htmlToText } from "@/components/ui/RichText";
import { createBrief, updateBrief, deleteBrief } from "@/api/briefs";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const EMPTY = { description: "", date: null, files: [], deleteAttachmentIds: [] };

/**
 * Briefs for a job or a task — the same shape on both, so one component covers
 * both via `scope`.
 *
 * Briefs arrive with the parent record (`allBriefs`), so there's no fetch here;
 * `invalidateKeys` tells us which caches to refresh after a write.
 */
const BriefsSection = ({ scope, parentId, briefs = [], editable = true, invalidateKeys = [] }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const refresh = () => invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));

  const saveMut = useMutation({
    mutationFn: (payload) =>
      editing
        ? updateBrief(user.role, scope, editing.id, payload)
        : createBrief(user.role, scope, { parentId, ...payload }),
    onSuccess: () => {
      refresh();
      toast.success(editing ? "Brief updated." : "Brief added.");
      setModalOpen(false);
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't save the brief.")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteBrief(user.role, scope, id),
    onSuccess: () => { refresh(); toast.success("Brief deleted."); setConfirmDelete(null); },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't delete the brief.")),
  });

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) }); setModalOpen(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ description: htmlToText(b.brief_description), date: b.brief_date ? String(b.brief_date).slice(0, 10) : null, files: [], deleteAttachmentIds: [] });
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("A brief needs a description.");
    if (form.description.trim().length > 255) return toast.error("Keep the description under 255 characters.");
    saveMut.mutate({
      description: form.description.trim(),
      date: form.date,
      files: form.files,
      deleteAttachmentIds: form.deleteAttachmentIds,
    });
  };

  const noun = scope === "task" ? "task" : "job";

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
          <Icon icon="solar:file-check-bold-duotone" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Briefs</span>
        <span className="text-[11px] text-[var(--ink-tertiary)]">{briefs.length}</span>
        {editable && (
          <Button size="xs" variant="secondary" icon="solar:add-circle-linear" onClick={openNew}>Add</Button>
        )}
      </div>

      {briefs.length === 0 ? (
        <p className="text-xs text-[var(--ink-tertiary)] px-4 py-6 text-center">
          No briefs yet. {editable ? `Add one to document scope, decisions or references for this ${noun}.` : ""}
        </p>
      ) : (
        <div className="divide-y divide-[var(--line-subtle)]">
          {briefs.map((b) => {
            const open = expanded === b.id;
            const count = b.attachments?.length || 0;
            return (
              <div key={b.id}>
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : b.id)}
                    className="flex items-start gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <motion.span
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-[var(--ink-tertiary)] flex-none mt-1"
                    >
                      <Icon icon="solar:alt-arrow-right-bold" className="text-[12px]" />
                    </motion.span>
                    <div className="min-w-0">
                      {open ? (
                        <RichText html={b.brief_description} className="text-sm" />
                      ) : (
                        <p className="text-sm text-[var(--ink-primary)] truncate">
                          {htmlToText(b.brief_description)}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--ink-tertiary)] mt-0.5 flex items-center gap-2 flex-wrap">
                        {b.brief_date && (
                          <span className="flex items-center gap-1">
                            <Icon icon="solar:calendar-linear" className="text-[11px]" />
                            {formatDate(b.brief_date)}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="flex items-center gap-1">
                            <Icon icon="solar:paperclip-linear" className="text-[11px]" />
                            {count} file{count === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>

                  {editable && (
                    <div className="flex items-center gap-0.5 flex-none">
                      <IconButton icon="solar:pen-linear" size="sm" label="Edit brief" onClick={() => openEdit(b)} />
                      <IconButton
                        icon="solar:trash-bin-trash-linear"
                        size="sm"
                        variant="danger"
                        label="Delete brief"
                        onClick={() => setConfirmDelete(b)}
                      />
                    </div>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {open && count > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-11">
                        <AttachmentList attachments={b.attachments} compact />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit brief" : "Add brief"} className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Description"
            required
            hint={`${form.description.length}/255 — the backend caps this at 255 characters`}
          >
            <TextArea
              autoFocus
              rows={3}
              maxLength={255}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={`What should everyone know about this ${noun}?`}
            />
          </Field>

          <Field label="Brief date">
            <DateField value={form.date} onChange={(d) => setForm((f) => ({ ...f, date: d }))} />
          </Field>

          {editing && editing.attachments?.length > 0 && (
            <Field label="Existing files" hint="Marked files are removed when you save">
              <ul className="space-y-1.5">
                {editing.attachments.map((a) => {
                  const marked = form.deleteAttachmentIds.includes(a.id);
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                        marked
                          ? "border-danger-400/40 bg-danger-500/5 opacity-60"
                          : "border-[var(--line-subtle)] bg-[var(--surface-sunken)]"
                      }`}
                    >
                      <Icon icon="solar:paperclip-linear" className="text-[14px] text-[var(--ink-tertiary)] flex-none" />
                      <span className={`text-xs flex-1 truncate ${marked ? "line-through text-[var(--ink-tertiary)]" : "text-[var(--ink-primary)]"}`}>
                        {a.file_name || "Attachment"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            deleteAttachmentIds: marked
                              ? f.deleteAttachmentIds.filter((id) => id !== a.id)
                              : [...f.deleteAttachmentIds, a.id],
                          }))
                        }
                        className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline flex-none"
                      >
                        {marked ? "Keep" : "Remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Field>
          )}

          <Field label={editing ? "Add more files" : "Attachments"}>
            <FilePicker files={form.files} onChange={(files) => setForm((f) => ({ ...f, files }))} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={saveMut.isPending}>{editing ? "Save changes" : "Add brief"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete brief?" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)]">
          This removes the brief and its {confirmDelete?.attachments?.length || 0} attached file
          {confirmDelete?.attachments?.length === 1 ? "" : "s"} permanently.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteMut.isPending} onClick={() => deleteMut.mutate(confirmDelete.id)}>
            Delete brief
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default BriefsSection;
