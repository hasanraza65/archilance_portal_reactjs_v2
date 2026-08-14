import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchChatContacts, fetchConversation, fetchConversationPage, sendChatMessage,
  updateChatMessage, deleteChatMessage, markConversationRead, reactToChatMessage, removeChatReaction,
} from "@/api/chat";
import { useAuth } from "@/auth/AuthContext";
import { getSocket } from "@/api/socket";
import { getAttachmentUrl } from "@/api/media";

export function useChatContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-contacts"],
    queryFn: () => fetchChatContacts().then((r) => r.data?.users || []),
    enabled: Boolean(user),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

/**
 * One conversation thread.
 *
 * Backed by react-query so switching to an already-visited chat paints from
 * cache INSTANTLY (no spinner, no "reload" flash) and revalidates in the
 * background. Sends are optimistic: the bubble appears immediately with a
 * pending flag, then is reconciled with the server's real message.
 */
export function useConversation(contactId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [olderPages, setOlderPages] = useState([]);
  const nextPageUrlRef = useRef(null);
  const tempIdRef = useRef(0);

  const queryKey = ["chat-conversation", contactId];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchConversation(contactId);
      nextPageUrlRef.current = res.data?.next_page_url || null;
      // Each page already arrives oldest→newest, which is exactly how it renders.
      // The backend sorts newest-first to paginate (so page 1 is the most RECENT
      // batch), then reverses the rows inside the page before returning them —
      // see ChatController::getConversation. Reversing again here would put the
      // newest message at the top of the thread.
      return res.data?.data || [];
    },
    enabled: Boolean(contactId) && Boolean(user),
    staleTime: 15_000,
    // Keeps the previous chat on screen while the next one loads instead of
    // unmounting to a spinner — this is what removes the flash on open.
    placeholderData: (prev) => prev,
  });

  const messages = [...olderPages, ...(data || [])];

  // Reset pagination when switching conversations.
  useEffect(() => {
    setOlderPages([]);
    nextPageUrlRef.current = null;
  }, [contactId]);

  // Mark read (fire-and-forget) whenever a conversation is opened/refreshed.
  useEffect(() => {
    if (!contactId || !data) return;
    markConversationRead(contactId)
      .then(() => qc.invalidateQueries({ queryKey: ["chat-contacts"] }))
      .catch(() => {});
  }, [contactId, data, qc]);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey }), [qc, contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("join", `user_${user.id}`);

    const onMessage = (payload) => {
      const from = payload?.sender_id;
      const to = payload?.receiver_id;
      if (String(from) === String(contactId) || String(to) === String(contactId)) refresh();
      qc.invalidateQueries({ queryKey: ["chat-contacts"] });
    };
    const onChanged = () => refresh();

    socket.on("chat-message", onMessage);
    socket.on("message-deleted", onChanged);
    socket.on("message-updated", onChanged);
    socket.on("message-reacted", onChanged);
    return () => {
      socket.off("chat-message", onMessage);
      socket.off("message-deleted", onChanged);
      socket.off("message-updated", onChanged);
      socket.off("message-reacted", onChanged);
    };
  }, [user, contactId, refresh, qc]);

  const loadMore = async () => {
    if (!nextPageUrlRef.current) return;
    const res = await fetchConversationPage(nextPageUrlRef.current);
    nextPageUrlRef.current = res.data?.next_page_url || null;
    // Page 2 is the batch BEFORE page 1, already oldest→newest within itself,
    // so it goes on the front of the thread untouched.
    setOlderPages((prev) => [...(res.data?.data || []), ...prev]);
  };

  const send = async (message, { replyTo, attachments = [] } = {}) => {
    if (!message?.trim() && attachments.length === 0) return;
    const tempId = `temp-${++tempIdRef.current}`;
    const optimistic = {
      id: tempId,
      message: message || "",
      sender_id: user.id,
      created_at: new Date().toISOString(),
      attachments: [],
      reactions: [],
      parent: replyTo ? { message: replyTo.message } : null,
      __pending: true,
      __hasAttachment: attachments.length > 0,
    };
    qc.setQueryData(queryKey, (old) => [...(old || []), optimistic]);
    setSending(true);
    try {
      const res = await sendChatMessage({ message, receiverId: contactId, replyTo: replyTo?.id, attachments });
      getSocket().emit("chat-message", { ...res.data?.chat, receiver_id: contactId });
      await qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["chat-contacts"] });
    } catch (err) {
      // Drop the optimistic bubble and surface the failure to the caller.
      qc.setQueryData(queryKey, (old) => (old || []).filter((m) => m.id !== tempId));
      throw err;
    } finally {
      setSending(false);
    }
  };

  const edit = async (messageId, message) => {
    qc.setQueryData(queryKey, (old) => (old || []).map((m) => (m.id === messageId ? { ...m, message } : m)));
    await updateChatMessage(messageId, message);
    getSocket().emit("message-updated", { messageId, content: message, receiverId: contactId });
    refresh();
  };

  const remove = async (messageId) => {
    qc.setQueryData(queryKey, (old) => (old || []).filter((m) => m.id !== messageId));
    await deleteChatMessage(messageId);
    getSocket().emit("message-deleted", { messageId, receiverId: contactId });
    refresh();
  };

  const react = async (messageId, reaction) => {
    await reactToChatMessage(messageId, reaction);
    getSocket().emit("message-reacted", { messageId, reaction, receiverId: contactId });
    refresh();
  };

  const unreact = async (messageId) => {
    await removeChatReaction(messageId);
    getSocket().emit("message-reacted", { messageId, removed: true, userId: user?.id, receiverId: contactId });
    refresh();
  };

  return {
    messages,
    // Only show the full-thread spinner on a genuinely cold load — cached
    // conversations render instantly while revalidating.
    loading: isLoading && !data,
    isRefreshing: isFetching,
    sending,
    hasMore: Boolean(nextPageUrlRef.current),
    loadMore,
    send,
    edit,
    remove,
    react,
    unreact,
  };
}

/**
 * There's no "forward by reference" endpoint on the backend (v1 doesn't have
 * one either) — a forward is just another `/api/chat/send` call to a
 * different receiver. Attachments are re-fetched from their existing URL and
 * re-uploaded as a fresh File since the send endpoint only accepts uploads.
 */
async function resolveForwardAttachments(message) {
  if (!message?.attachments?.length) return [];
  const files = await Promise.all(
    message.attachments.map(async (a) => {
      try {
        const res = await fetch(getAttachmentUrl(a.file_path, a.created_at));
        const blob = await res.blob();
        return new File([blob], a.file_name || "attachment", { type: blob.type || a.mime_type || "application/octet-stream" });
      } catch {
        return null; // best-effort — drop attachments that fail to re-fetch rather than blocking the whole forward
      }
    })
  );
  return files.filter(Boolean);
}

/** Forward one message's text + attachments to one or more contacts. */
export function useForwardMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, contactIds }) => {
      const attachments = await resolveForwardAttachments(message);
      const sent = await Promise.all(
        contactIds.map(async (id) => {
          const res = await sendChatMessage({ message: message.message || "", receiverId: id, attachments });
          getSocket().emit("chat-message", { ...res.data?.chat, receiver_id: id });
          return id;
        })
      );
      return sent;
    },
    onSuccess: (contactIds) => {
      contactIds.forEach((id) => qc.invalidateQueries({ queryKey: ["chat-conversation", id] }));
      qc.invalidateQueries({ queryKey: ["chat-contacts"] });
    },
  });
}
