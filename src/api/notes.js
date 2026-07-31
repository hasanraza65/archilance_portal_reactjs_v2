import { apiClient } from "./client";
import { ep } from "./endpoint";

/**
 * Checklist notes attached to a job or a task.
 *
 * Quirk to be aware of: the column is called `project_id` for BOTH, and `type`
 * ("project" | "task") is what says which id it actually holds. So a task note
 * stores the TASK id in `project_id`. That's v1's convention and the backend
 * has no separate task column, so we mirror it exactly.
 *
 * Reads come free with the parent record (`all_notes` on project/task detail);
 * these are the writes.
 */
export async function createNote(role, { parentId, text, type }) {
  const res = await apiClient.post(ep(role, "/notes"), {
    project_id: parentId,
    note_text: text,
    type,
  });
  return res.data?.data ?? res.data;
}

/** Bulk create — one row per line, used when pasting a list. */
export async function createNotesBulk(role, { parentId, texts = [], type }) {
  const res = await apiClient.post(ep(role, "/create-bulk-notes"), {
    notes: texts.map((note_text) => ({ note_text, project_id: parentId, type })),
  });
  return res.data;
}

export async function updateNote(role, noteId, { text, parentId }) {
  const res = await apiClient.put(ep(role, `/notes/${noteId}`), {
    note_text: text,
    project_id: parentId,
  });
  return res.data?.data ?? res.data;
}

/** Tick / untick. Separate endpoint — `update` would wipe the status. */
export async function updateNoteStatus(role, noteId, done) {
  const res = await apiClient.post(ep(role, "/update-note-status"), {
    note_id: noteId,
    status: done ? 1 : 0,
  });
  return res.data?.data ?? res.data;
}

export async function deleteNote(role, noteId) {
  const res = await apiClient.delete(ep(role, `/notes/${noteId}`));
  return res.data;
}

/** The backend stores status as 0/1 but has returned "1"/true historically. */
export const isNoteDone = (note) =>
  note?.status === 1 || note?.status === true || note?.status === "1";
