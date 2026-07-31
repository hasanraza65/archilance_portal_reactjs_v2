import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchComments, fetchCommentsPage, createComment, updateComment, deleteComment, COMMENT_SCOPES,
} from "@/api/comments";
import { useAuth } from "@/auth/AuthContext";
import { getSocket } from "@/api/socket";

/**
 * Loads a task's comment thread and keeps it live via the same Socket.IO room
 * convention v1 uses (`task_{taskId}`), so edits made in the OLD app (or by
 * other v2 tabs) show up here too without a refresh.
 *
 * Posting is optimistic — the comment appears instantly with a pending flag and
 * is reconciled once the server responds.
 *
 * `scope` picks which of the task's two threads to load:
 *   "internal" — staff-only  (allowed_customer = 0)
 *   "client"   — shared with the customer (allowed_customer = 1)
 * Posting writes the flag that matches the thread, so a reply can never land in
 * the wrong one.
 */
export function useComments(taskId, scope = "internal") {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const tempIdRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!user || !taskId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetchComments(user.role, taskId, 1, scope);
        setComments(res.comments);
        setNextPageUrl(res.nextPageUrl);
        setTotal(res.total);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, taskId, scope]
  );

  useEffect(() => {
    setComments([]);
    load();
  }, [load]);

  useEffect(() => {
    if (!taskId) return;
    const socket = getSocket();
    socket.emit("join", `task_${taskId}`);
    const refresh = () => load({ silent: true });
    socket.on("comment-added", refresh);
    socket.on("comment-updated", refresh);
    socket.on("comment-deleted", refresh);
    socket.on("comment-replied", refresh);
    return () => {
      socket.off("comment-added", refresh);
      socket.off("comment-updated", refresh);
      socket.off("comment-deleted", refresh);
      socket.off("comment-replied", refresh);
    };
  }, [taskId, load]);

  const loadMore = async () => {
    if (!nextPageUrl) return;
    const res = await fetchCommentsPage(nextPageUrl, taskId);
    setComments((prev) => [...res.comments, ...prev]);
    setNextPageUrl(res.nextPageUrl);
  };

  const post = async (message, { replyTo = null, attachments = [] } = {}) => {
    if (!message?.trim() && attachments.length === 0) return;
    const tempId = `temp-${++tempIdRef.current}`;
    const optimistic = {
      id: tempId,
      comment_message: message || "",
      reply_to: replyTo,
      created_at: new Date().toISOString(),
      sender: { id: user.id, name: user.name, profile_pic: user.profile_pic },
      comment_attachments: [],
      replies: [],
      __pending: true,
      __hasAttachment: attachments.length > 0,
    };
    setComments((prev) => [...prev, optimistic]);
    setPosting(true);
    try {
      await createComment(user.role, {
        taskId,
        message: message || "",
        replyTo,
        allowedCustomer: COMMENT_SCOPES[scope]?.allowedCustomer ?? 0,
        attachments,
      });
      await load({ silent: true });
      getSocket().emit("comment-added", { taskId, allowed_customer: COMMENT_SCOPES[scope]?.allowedCustomer ?? 0 });
    } catch (err) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      throw err;
    } finally {
      setPosting(false);
    }
  };

  const edit = async (commentId, message) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, comment_message: message } : c)));
    await updateComment(user.role, commentId, { message });
    await load({ silent: true });
    getSocket().emit("comment-updated", { taskId });
  };

  const remove = async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await deleteComment(user.role, commentId);
    await load({ silent: true });
    getSocket().emit("comment-deleted", { taskId });
  };

  return { comments, total, hasMore: Boolean(nextPageUrl), loading, posting, loadMore, post, edit, remove, reload: load };
}
