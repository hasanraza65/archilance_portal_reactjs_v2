import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { meRequest } from "@/api/auth";
import { updateProfile, updateProfilePic, updatePassword } from "@/api/profile";
import { getMediaUrl } from "@/api/media";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { useAuth } from "@/auth/AuthContext";

const profileSchema = yup.object({
  name: yup.string().required("Name is required"),
  username: yup.string().nullable(),
  email: yup.string().email("Invalid email").nullable(),
  phone: yup
    .string()
    .nullable()
    .matches(/^[0-9+()\-\s]*$/, { message: "Invalid phone number", excludeEmptyString: true }),
});

const passwordSchema = yup.object({
  current_password: yup.string().required("Current password is required"),
  password: yup.string().min(8, "At least 8 characters").required("New password is required"),
  password_confirmation: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords don't match")
    .required("Please confirm your new password"),
});

const ProfilePage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState("details");

  const { data: profile, isLoading } = useQuery({ queryKey: ["profile-me"], queryFn: () => meRequest().then((r) => r.data) });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: savingProfile },
  } = useForm({ resolver: yupResolver(profileSchema) });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: savingPassword },
  } = useForm({ resolver: yupResolver(passwordSchema) });

  useEffect(() => {
    if (profile) {
      resetProfile({ name: profile.name || "", username: profile.username || "", email: profile.email || "", phone: profile.phone || "" });
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't update your profile.")),
  });

  const picMutation = useMutation({
    mutationFn: updateProfilePic,
    onSuccess: () => {
      toast.success("Profile photo updated.");
      qc.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't update your photo.")),
  });

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("Password changed.");
      resetPassword();
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't change your password.")),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) return toast.error("Image must be under 2MB.");
    setPreview(URL.createObjectURL(file));
    picMutation.mutate(file);
  };

  const avatarSrc = preview || (profile?.profile_pic ? getMediaUrl(profile.profile_pic, profile.created_at) : null);

  if (isLoading) {
    return <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>;
  }

  return (
    <div className="pb-10 max-w-2xl">
      <PageHeader title="Profile" subtitle="Manage your account details and security." />

      <div className="px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar name={profile?.name} src={avatarSrc} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Icon icon="solar:camera-bold" className="text-white text-lg" />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" hidden onChange={handleFile} />
          </div>
          <div>
            <p className="font-semibold text-[var(--ink-primary)]">{profile?.name}</p>
            <Badge tone="primary" className="mt-1 capitalize">{user?.role}</Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--line-subtle)]">
          {[{ key: "details", label: "Details" }, { key: "security", label: "Security" }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-[var(--ink-secondary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <form
            onSubmit={handleProfileSubmit((data) => profileMutation.mutate(data))}
            className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Name</label>
              <input {...registerProfile("name")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {profileErrors.name && <p className="text-xs text-danger-500 mt-1">{profileErrors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Username</label>
              <input {...registerProfile("username")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Email</label>
              <input {...registerProfile("email")} type="email" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {profileErrors.email && <p className="text-xs text-danger-500 mt-1">{profileErrors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Phone</label>
              <input {...registerProfile("phone")} className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {profileErrors.phone && <p className="text-xs text-danger-500 mt-1">{profileErrors.phone.message}</p>}
            </div>
            <Button type="submit" isLoading={savingProfile}>Save changes</Button>
          </form>
        ) : (
          <form
            onSubmit={handlePasswordSubmit((data) => passwordMutation.mutate(data))}
            className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Current password</label>
              <input {...registerPassword("current_password")} type="password" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {passwordErrors.current_password && <p className="text-xs text-danger-500 mt-1">{passwordErrors.current_password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">New password</label>
              <input {...registerPassword("password")} type="password" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {passwordErrors.password && <p className="text-xs text-danger-500 mt-1">{passwordErrors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Confirm new password</label>
              <input {...registerPassword("password_confirmation")} type="password" className="w-full h-10 px-3 rounded-lg border border-[var(--line-subtle)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              {passwordErrors.password_confirmation && <p className="text-xs text-danger-500 mt-1">{passwordErrors.password_confirmation.message}</p>}
            </div>
            <Button type="submit" isLoading={savingPassword}>Change password</Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
