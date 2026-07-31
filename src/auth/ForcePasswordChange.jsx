import React, { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Field, TextField } from "@/components/ui/Field";
import { updatePassword } from "@/api/profile";
import { useAuth } from "./AuthContext";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

/**
 * Blocks the app until a temporary password is replaced.
 *
 * Two ways an account ends up flagged with `is_default_pass = 1`:
 *   - a customer invites a team member, who is created with a generated password
 *   - anyone uses "Forgot password", which mails a new temporary one
 *
 * v1 only gates role 5 (customer team members), so this matches that exactly
 * rather than locking out staff who happen to carry the flag. There is no
 * dismiss and no escape hatch — that's the point.
 */
const GATED_ROLES = ["member"];

const ForcePasswordChange = () => {
  const { user, refreshUser, logout } = useAuth();
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  const required = Boolean(user) && GATED_ROLES.includes(user.role) && Number(user.is_default_pass) === 1;
  if (!required) return null;

  const set = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!values.current) next.current = "Enter the temporary password you were sent";
    if (!values.next) next.next = "Choose a new password";
    else if (values.next.length < 8) next.next = "At least 8 characters";
    if (values.next !== values.confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await updatePassword({
        current_password: values.current,
        password: values.next,
        password_confirmation: values.confirm,
      });
      toast.success("Password updated — you're all set.");
      // Re-read /me so `is_default_pass` flips to 0 and this dialog unmounts.
      await refreshUser();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't update your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open static onClose={() => {}} className="relative z-[60]">
      <div className="fixed inset-0 bg-[var(--surface-overlay)] backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel as={motion.div}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-panel bg-[var(--surface-raised)] shadow-float border border-[var(--line-subtle)] p-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Icon icon="solar:lock-password-bold-duotone" className="text-[24px]" />
          </div>

          <h2 className="text-lg font-bold text-[var(--ink-primary)]">Set a new password</h2>
          <p className="text-sm text-[var(--ink-secondary)] mt-1.5 mb-5">
            You're signed in with a temporary password. Choose your own before continuing.
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <Field label="Temporary password" required error={errors.current}>
              <TextField
                type={show ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                value={values.current}
                onChange={(e) => set("current", e.target.value)}
                placeholder="The one you were emailed"
                invalid={!!errors.current}
              />
            </Field>

            <Field label="New password" required error={errors.next} hint="At least 8 characters">
              <div className="relative">
                <TextField
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={values.next}
                  onChange={(e) => set("next", e.target.value)}
                  className="pr-11"
                  invalid={!!errors.next}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  tabIndex={-1}
                  aria-label={show ? "Hide passwords" : "Show passwords"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
                >
                  <Icon icon={show ? "solar:eye-closed-linear" : "solar:eye-linear"} className="text-[16px]" />
                </button>
              </div>
            </Field>

            <Field label="Confirm new password" required error={errors.confirm}>
              <TextField
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={values.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                invalid={!!errors.confirm}
              />
            </Field>

            <Button type="submit" size="lg" isLoading={saving} className="w-full mt-1">
              Update password
            </Button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] mt-4"
          >
            Sign out instead
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default ForcePasswordChange;
