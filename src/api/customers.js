import { apiClient } from "./client";
import { ep } from "./endpoint";

export async function fetchCustomers(role) {
  const res = await apiClient.get(ep(role, "/customer-user"));
  const data = res.data;
  return Array.isArray(data) ? data : data?.data || [];
}

export async function fetchCustomer(role, id) {
  const res = await apiClient.get(ep(role, `/customer-user/${id}`));
  return res.data;
}

export async function createCustomer(role, { name, email, username, phone, password, passwordConfirmation, subscriptionFrom }) {
  const res = await apiClient.post(ep(role, "/customer-user"), {
    name, email, username, phone, password,
    password_confirmation: passwordConfirmation,
    user_role: 4,
    subscription_from: subscriptionFrom || null,
  });
  return res.data;
}

export async function updateCustomer(role, id, { name, email, username, phone, subscriptionFrom, profilePic, password, passwordConfirmation }) {
  const form = new FormData();
  form.append("_method", "PUT");
  form.append("name", name);
  form.append("email", email || "");
  form.append("username", username || "");
  form.append("phone", phone || "");
  form.append("user_role", 4);
  form.append("subscription_from", subscriptionFrom || "");
  if (profilePic) form.append("profile_pic", profilePic);
  if (password) {
    form.append("password", password);
    form.append("password_confirmation", passwordConfirmation);
  }
  const res = await apiClient.post(ep(role, `/customer-user/${id}`), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteCustomer(role, id) {
  const res = await apiClient.delete(ep(role, `/customer-user/${id}`));
  return res.data;
}
