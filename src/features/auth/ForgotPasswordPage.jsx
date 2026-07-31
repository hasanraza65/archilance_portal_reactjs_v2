import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { homeRouteForRole } from "@/lib/nav";
import { forgotPasswordRequest } from "@/api/auth";
import { extractErrorMessage } from "@/api/client";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import AuthShell from "./AuthShell";

const schema = yup.object({
  email: yup.string().email("That doesn't look like a valid email").required("Email is required"),
});

/**
 * Password recovery. The backend does NOT send a reset link — it generates a
 * new temporary password and emails it, then flags the account so the user is
 * asked to change it. The copy below says exactly that, so nobody sits waiting
 * for a link that never arrives.
 */
const ForgotPasswordPage = () => {
  const { isAuthenticated, user, booting } = useAuth();
  const [sentTo, setSentTo] = useState(null);
  const [serverMessage, setServerMessage] = useState(null);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  if (!booting && isAuthenticated) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  const onSubmit = async ({ email }) => {
    setError(null);
    try {
      const res = await forgotPasswordRequest(email);
      setServerMessage(res?.data?.message || null);
      setSentTo(email);
    } catch (err) {
      setError(extractErrorMessage(err, "We couldn't send the recovery email. Please try again."));
    }
  };

  const backLink = (
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-secondary)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
    >
      <Icon icon="solar:arrow-left-linear" className="text-[15px]" />
      Back to sign in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthShell
        headline={
          <>
            Locked out? <span className="text-primary-300">We'll get you back in.</span>
          </>
        }
        sub="Recovery takes about a minute — check your inbox and sign straight back in."
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-14 h-14 rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5"
        >
          <Icon icon="solar:letter-opened-linear" className="text-[26px]" />
        </motion.div>

        <h2 className="text-2xl font-bold text-[var(--ink-primary)]">Check your inbox</h2>
        <p className="text-sm text-[var(--ink-secondary)] mt-2">
          {serverMessage || (
            <>
              We've emailed a new temporary password to{" "}
              <span className="font-semibold text-[var(--ink-primary)]">{sentTo}</span>. Sign in with
              it, then change it from your profile.
            </>
          )}
        </p>

        <div className="mt-5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] p-3.5 space-y-2">
          <p className="text-xs text-[var(--ink-secondary)] flex items-start gap-2">
            <Icon icon="solar:clock-circle-linear" className="text-[14px] mt-0.5 flex-none text-[var(--ink-tertiary)]" />
            It can take a couple of minutes to arrive.
          </p>
          <p className="text-xs text-[var(--ink-secondary)] flex items-start gap-2">
            <Icon icon="solar:folder-open-linear" className="text-[14px] mt-0.5 flex-none text-[var(--ink-tertiary)]" />
            No sign of it? Check your spam or junk folder.
          </p>
        </div>

        <div className="flex items-center justify-between mt-7">
          {backLink}
          <button
            type="button"
            onClick={() => { setSentTo(null); setServerMessage(null); }}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Try another email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      headline={
        <>
          Locked out? <span className="text-primary-300">We'll get you back in.</span>
        </>
      }
      sub="Recovery takes about a minute — check your inbox and sign straight back in."
    >
      <div className="w-14 h-14 rounded-2xl bg-primary-500/12 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-5">
        <Icon icon="solar:lock-password-bold-duotone" className="text-[26px]" />
      </div>

      <h2 className="text-2xl font-bold text-[var(--ink-primary)]">Forgot your password?</h2>
      <p className="text-sm text-[var(--ink-secondary)] mt-1.5 mb-7">
        Enter the email on your account and we'll send you a new temporary password.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Email address</label>
          <div className="relative">
            <Icon
              icon="solar:letter-linear"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[16px]"
            />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              autoFocus
              className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-shadow"
              placeholder="you@archilance.net"
            />
          </div>
          {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message}</p>}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5">
            <Icon icon="solar:danger-triangle-bold" className="text-[15px] text-red-500 mt-0.5 flex-none" />
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full mt-2">
          Send recovery email
        </Button>
      </form>

      <div className="mt-7">{backLink}</div>

      <p className="text-[11px] text-[var(--ink-tertiary)] mt-6">
        Use the email address your account was created with. If it isn't recognised, ask an admin to
        confirm which address is on file.
      </p>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
