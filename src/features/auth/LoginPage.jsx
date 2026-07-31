import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { homeRouteForRole } from "@/lib/nav";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import AuthShell from "./AuthShell";

const schema = yup.object({
  login: yup.string().required("Email, username or phone is required"),
  password: yup.string().required("Password is required"),
});

const LoginPage = () => {
  const { isAuthenticated, user, login, booting } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  if (!booting && isAuthenticated) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  const onSubmit = async (values) => {
    try {
      const loggedInUser = await login(values.login, values.password);
      toast.success(`Welcome back, ${loggedInUser.name?.split(" ")[0] || "there"}!`);
      navigate(homeRouteForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, "Invalid credentials."));
    }
  };

  return (
    <AuthShell
      headline={
        <>
          Every job, task and hour — <span className="text-primary-300">in one clean view.</span>
        </>
      }
      sub="Jobs, tasks, work diaries and your whole team, redesigned to feel instant."
    >
      <h2 className="text-2xl font-bold text-[var(--ink-primary)]">Welcome back</h2>
      <p className="text-sm text-[var(--ink-secondary)] mt-1 mb-7">Sign in to continue to your workspace.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">
            Email, username or phone
          </label>
          <input
            {...register("login")}
            type="text"
            autoComplete="username"
            className="w-full h-11 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-shadow"
            placeholder="you@archilance.net"
          />
          {errors.login && <p className="text-xs text-danger-500 mt-1">{errors.login.message}</p>}
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[var(--ink-secondary)]">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="w-full h-11 px-3.5 pr-11 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-shadow"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
              tabIndex={-1}
            >
              <Icon icon={showPassword ? "solar:eye-closed-linear" : "solar:eye-linear"} className="text-lg" />
            </button>
          </div>
          {errors.password && <p className="text-xs text-danger-500 mt-1">{errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full mt-2">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
