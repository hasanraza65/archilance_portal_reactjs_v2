import { apiClient } from "./client";

export const fetchChatContacts = () => apiClient.get("/api/chat/users-list");

export const fetchConversation = (contactId) => apiClient.get(`/api/chat/conversations/${contactId}`);

export const fetchConversationPage = (nextPageUrl) => {
  const url = new URL(nextPageUrl);
  return apiClient.get(url.pathname + url.search);
};

export const sendChatMessage = ({ message, receiverId, replyTo, attachments = [] }) => {
  const form = new FormData();
  form.append("message", message || "");
  form.append("receiver_id", receiverId);
  if (replyTo) form.append("reply_to", replyTo);
  attachments.forEach((file, i) => form.append(`attachments[${i}]`, file));
  return apiClient.post("/api/chat/send", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const updateChatMessage = (messageId, message) => {
  const form = new FormData();
  form.append("message", message);
  return apiClient.post(`/api/chat/update/${messageId}`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteChatMessage = (messageId) => apiClient.delete(`/api/chat/delete/${messageId}`);

export const markConversationRead = (userId) => apiClient.post("/api/chat/bulk-read-status", { user_id: userId });

export const reactToChatMessage = (chatId, reaction) => {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("reaction", reaction);
  return apiClient.post("/api/chat/reaction", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const removeChatReaction = (chatId) => {
  const form = new FormData();
  form.append("chat_id", chatId);
  return apiClient.post("/api/chat/remove-reaction", form, { headers: { "Content-Type": "multipart/form-data" } });
};

/* ------------------------- Project (job) chat ------------------------ */
// Same path is reused for internal vs. customer-visible messages; `allowedCustomer`
// (sent as the string "1") is the only thing that distinguishes them, matching v1.
export const fetchProjectChat = (role, projectId, { forCustomers = false } = {}) => {
  const prefix = role === "admin" ? "admin" : role === "customer" ? "customer" : "employee";
  const path = forCustomers && prefix !== "customer" ? "project-chat-with-customers" : "project-chat";
  return apiClient.get(`/api/${prefix}/${path}/${projectId}`);
};

export const sendProjectChatMessage = (role, { projectId, message, allowedCustomer = false, attachments = [] }) => {
  const prefix = role === "admin" ? "admin" : role === "customer" ? "customer" : "employee";
  const form = new FormData();
  form.append("project_id", projectId);
  form.append("message", message);
  if (allowedCustomer) form.append("allowed_customer", "1");
  attachments.forEach((file, i) => form.append(`attachments[${i}]`, file));
  return apiClient.post(`/api/${prefix}/project-chat`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteProjectChatMessage = (role, messageId) => {
  const prefix = role === "admin" ? "admin" : role === "customer" ? "customer" : "employee";
  return apiClient.delete(`/api/${prefix}/project-chat/${messageId}`);
};
