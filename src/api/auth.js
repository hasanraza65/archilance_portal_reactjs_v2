import { apiClient } from "./client";

// No role prefix — these are the flat /api/* routes on the live backend.
export const loginRequest = (login, password) =>
  apiClient.post("/api/login", { login, password, fcm_token: null });

export const logoutRequest = () => apiClient.post("/api/logout");

export const meRequest = () => apiClient.get("/api/me");

export const forgotPasswordRequest = (email) =>
  apiClient.post("/api/forgot-password", { email });
