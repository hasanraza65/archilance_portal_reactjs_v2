import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchChatContacts, fetchConversation, fetchConversationPage, sendChatMessage,
  updateChatMessage, deleteChatMessage, markConversationRead, reactToChatMessage, removeChatReaction,
} from "@/api/chat";
import { useAuth } from "@/auth/AuthContext";
import { getSocket } from "@/api/socket";

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
      // API returns newest-first; the UI renders oldest→newest.
      return (res.data?.data || []).slice().reverse();
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
    setOlderPages((prev) => [...(res.data?.data || []).slice().reverse(), ...prev]);
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
