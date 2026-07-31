import { apiClient } from "./client";

export const fetchActiveSubscription = () => apiClient.get("/api/customer/subscription/active");

export const fetchBillingDetails = () => apiClient.get("/api/customer/subscription/billing-detail");

export const createBillingDetail = (data) => apiClient.post("/api/customer/subscription/billing-detail/create", data);

export const updateBillingDetail = (id, data) => apiClient.post("/api/customer/subscription/update-billing-detail", { ...data, id });

export const deleteBillingDetail = (id) => apiClient.delete(`/api/customer/subscription/billing-detail/delete/${id}`);

export const fetchPaymentMethods = () => apiClient.get("/api/customer/payment-method/list");

export const setDefaultPaymentMethod = (paymentMethodId) =>
  apiClient.post("/api/customer/payment-method/set-default", { payment_method_id: paymentMethodId });

export const deletePaymentMethod = (cardId) => apiClient.delete(`/api/customer/payment-method/delete/${cardId}`);
