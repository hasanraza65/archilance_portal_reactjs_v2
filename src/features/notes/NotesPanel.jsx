import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import InlineAddField from "@/components/ui/InlineAddField";
import { createNote, createNotesBulk, updateNote, updateNoteStatus, deleteNote, isNoteDone } from "@/api/notes";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

/**
 * Checklist notes for a job or a task.
 *
 * Notes arrive with the parent record (`all_notes`), so this seeds from that and
 * then owns the list locally — every action is optimistic and rolls back on
 * failure, because a checklist that lags behind the click feels broken.
 *
 * Pasting multiple lines creates one note per line via the bulk endpoint.
 */
const NotesPanel = ({ parentId, type, notes = [], editable = true, invalidateKeys = [] }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [items, setItems] = useState(notes);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [hideDone, setHideDone] = useState(false);

  // Re-seed when the parent record refetches (or we switch task).
  useEffect(() => { setItems(notes); }, [notes]);

  const refresh = () => invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));

  const doneCount = useMemo(() => items.filter(isNoteDone).length, [items]);
  const visible = hideDone ? items.filter((n) => !isNoteDone(n)) : items;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const add = async (value) => {
    const raw = (typeof value === "string" ? value : draft).trim();
    if (!raw) return;
    // One note per line, so pasting a list Just Works.
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    setDraft("");
    try {
      if (lines.length > 1) {
        await createNotesBulk(user.role, { parentId, texts: lines, type });
      } else {
        await createNote(user.role, { parentId, text: lines[0], type });
      }
      toast.success(lines.length > 1 ? `${lines.length} notes added.` : "Note added.");
      refresh();
    } catch (err) {
      setDraft(raw);
      toast.error(extractErrorMessage(err, "Couldn't add that note."));
    }
  };

  const toggle = async (note) => {
    const next = !isNoteDone(note);
    setItems((prev) => prev.map((n) => (n.id === note.id ? { ...n, status: next ? 1 : 0 } : n)));
    try {
      await updateNoteStatus(user.role, note.id, next);
      refresh();
    } catch (err) {
      setItems((prev) => prev.map((n) => (n.id === note.id ? { ...n, status: note.status } : n)));
      toast.error(extractErrorMessage(err, "Couldn't update that note."));
    }
  };

  const saveEdit = async (note) => {
    const next = editText.trim();
    setEditingId(null);
    if (!next || next === note.note_text) return;
    const before = note.note_text;
    setItems((prev) => prev.map((n) => (n.id === note.id ? { ...n, note_text: next } : n)));
    try {
      await updateNote(user.role, note.id, { text: next, parentId });
      refresh();
    } catch (err) {
      setItems((prev) => prev.map((n) => (n.id === note.id ? { ...n, note_text: before } : n)));
      toast.error(extractErrorMessage(err, "Couldn't save that note."));
    }
  };

  const remove = async (note) => {
    const before = items;
    setItems((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await deleteNote(user.role, note.id);
      refresh();
    } catch (err) {
      setItems(before);
      toast.error(extractErrorMessage(err, "Couldn't delete that note."));
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-subtle)]">
        <span className="w-6 h-6 rounded-md bg-primary-500/12 flex items-center justify-center flex-none">
          <Icon icon="solar:check-square-bold-duotone" className="text-[13px] text-primary-500" />
        </span>
        <span className="text-sm font-semibold text-[var(--ink-primary)] flex-1">Checklist</span>
        {items.length > 0 && (
          <>
            <span className="text-[11px] text-[var(--ink-tertiary)]">{doneCount}/{items.length}</span>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={() => setHideDone((h) => !h)}
                className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                {hideDone ? "Show done" : "Hide done"}
              </button>
            )}
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1 bg-[var(--surface-sunken)]">
          <motion.div
            className="h-full bg-primary-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}

      <div className="p-2">
        {visible.length === 0 ? (
          <p className="text-xs text-[var(--ink-tertiary)] px-2 py-3">
            {items.length > 0 ? "Everything's ticked off." : "No checklist items yet."}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((note) => {
              const done = isNoteDone(note);
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-sunken)]"
                >
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => toggle(note)}
                    aria-label={done ? "Mark as not done" : "Mark as done"}
                    className={cn(
                      "w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-none transition-colors",
                      done ? "bg-primary-500 border-primary-500 text-white" : "border-[var(--line-strong)] hover:border-primary-400",
                      !editable && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {done && <Icon icon="solar:check-read-linear" className="text-[10px]" />}
                  </button>

                  {editingId === note.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(note)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(note);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-[13px] bg-transparent outline-none border-b border-primary-300 pb-0.5"
                    />
                  ) : (
                    <span
                      onClick={() => { if (editable) { setEditingId(note.id); setEditText(note.note_text || ""); } }}
                      className={cn(
                        "flex-1 text-[13px] break-words",
                        editable && "cursor-text",
                        done ? "line-through text-[var(--ink-tertiary)]" : "text-[var(--ink-primary)]"
                      )}
                    >
                      {note.note_text}
                    </span>
                  )}

                  {editable && (
                    <IconButton
                      icon="solar:trash-bin-trash-linear"
                      size="sm"
                      variant="danger"
                      label="Delete note"
                      onClick={() => remove(note)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {editable && (
          adding ? (
            <div className="px-2 py-1.5">
              <InlineAddField
                value={draft}
                onChange={setDraft}
                onSubmit={add}
                onCancel={() => { setDraft(""); setAdding(false); }}
                placeholder="Add an item — paste a list for several"
                icon="solar:check-square-bold-duotone"
                multiline
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-[var(--ink-tertiary)] hover:text-primary-500 rounded-lg w-full"
            >
              <Icon icon="solar:add-circle-linear" className="text-[15px]" />
              Add item
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default NotesPanel;
