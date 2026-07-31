import { apiClient } from "./client";

/* ----------------------------- Templates ----------------------------- */
export const fetchTemplates = () => apiClient.get("/api/contract-templates");
export const fetchTemplate = (id) => apiClient.get(`/api/contract-templates/${id}`);
export const createTemplate = (data) => apiClient.post("/api/contract-templates", data);
export const updateTemplate = (id, data) => apiClient.put(`/api/contract-templates/${id}`, data);
export const deleteTemplate = (id) => apiClient.delete(`/api/contract-templates/${id}`);

/* ----------------------------- Variables ----------------------------- */
export const fetchContractVariables = () => apiClient.get("/api/contract-variables");

/* ----------------------------- Contracts ----------------------------- */
export const fetchContracts = (params = {}) => apiClient.get("/api/contracts", { params });
export const fetchContract = (id) => apiClient.get(`/api/contracts/${id}`);
export const createContract = (data) => apiClient.post("/api/contracts", data);
export const updateContract = (id, data) => apiClient.put(`/api/contracts/${id}`, data);
export const updateContractStatus = (id, status) => apiClient.patch(`/api/contracts/${id}/status`, { status });
export const resendContract = (id) => apiClient.post(`/api/contracts/${id}/resend`);
export const deleteContract = (id) => apiClient.delete(`/api/contracts/${id}`);

/* --------------------------- Public (no auth) ------------------------ */
export const fetchPublicContract = (token) =>
  apiClient.get(`/api/contracts/public/${token}`, { headers: { Accept: "application/json" } });
export const acceptPublicContract = (token) =>
  apiClient.post(`/api/contracts/public/${token}/accept`, {}, { headers: { Accept: "application/json" } });
