import { apiClient } from "./client";

export const updateProfile = (data) => apiClient.post("/api/update-profile", data);

export const updateProfilePic = (file) => {
  const form = new FormData();
  form.append("profile_pic", file);
  return apiClient.post("/api/update-profile-pic", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updatePassword = (data) => apiClient.post("/api/update-password", data);
