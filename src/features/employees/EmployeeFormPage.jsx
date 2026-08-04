import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import Toggle from "@/components/ui/Toggle";
import SearchSelect from "@/components/ui/SearchSelect";
import DateField from "@/components/ui/DateField";
import { Field, TextField } from "@/components/ui/Field";
import { EMPLOYEE_TYPES } from "@/api/employees";
import { useAllEmployees } from "./useEmployeesData";
import { useCreateEmployee, useUpdateEmployee, useEmployee } from "./useEmployeeMutations";
import { useAuth } from "@/auth/AuthContext";
import { isAdminOrExecutive } from "@/lib/roles";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const EMPTY = {
  name: "", email: "", username: "", phone: "",
  employeeType: "Employee", joiningDate: null, probationEndDate: null,
  managerId: null, interneeManagerId: null, employeeTeam: null,
  password: "", passwordConfirmation: "",
  contractStatus: false,
};

const TYPE_HINT = {
  Employee: "Standard team member — tracks time and works on assigned tasks.",
  Manager: "Can manage employees, assign work and grade internees.",
  Supervisor: "Oversight across jobs, without full admin rights.",
  Executive: "Manager-level plus visibility of leave reviewers and all internee grading.",
  Outsource: "External contributor with employee-level access.",
  Internee: "Graded daily by an assigned manager; grading unlocks a month after joining.",
};

const toDateOnly = (v) => (v ? String(v).slice(0, 10) : null);

const EmployeeFormPage = () => {
  const { employeeId } = useParams();
  const isEdit = Boolean(employeeId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSetContract = isAdminOrExecutive(user?.role);

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useEmployee(isEdit ? employeeId : null);
  const { data: roster = [], isLoading: loadingRoster } = useAllEmployees();
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();

  useEffect(() => {
    if (!existing) return;
    setValues({
      ...EMPTY,
      name: existing.name || "",
      email: existing.email || "",
      username: existing.username || "",
      phone: existing.phone || "",
      employeeType: existing.employee_type || "Employee",
      joiningDate: toDateOnly(existing.joining_date),
      probationEndDate: toDateOnly(existing.probation_period_end_date),
      managerId: existing.manager_id || null,
      interneeManagerId: existing.internee_manager_id || null,
      employeeTeam: existing.employee_team || null,
      contractStatus: Number(existing.contract_status) === 1,
    });
  }, [existing]);

  const set = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  // Anyone who could plausibly line-manage someone. Excludes the person being
  // edited so they can't become their own manager.
  const managerOptions = useMemo(
    () =>
      roster
        .filter((e) => ["Manager", "Executive", "Supervisor"].includes(e.employee_type))
        .filter((e) => String(e.id) !== String(employeeId))
        .map((e) => ({ value: e.id, label: e.name, sub: e.employee_type })),
    [roster, employeeId]
  );

  const isInternee = values.employeeType === "Internee";

  // Teams are fixed labels agreed with management; the backend stores a free
  // string, so adding one later is a one-line change here.
  const TEAM_OPTIONS = [
    { value: "BIM Team", label: "BIM Team" },
    { value: "3D Team", label: "3D Team" },
    { value: "Outsource Department", label: "Outsource Department" },
  ];
  // Deliberately narrower than who can open this form (supervisors can, but
  // were not included when this field was specced). Widen here if that changes.
  const canSetTeam = ["admin", "executive", "manager"].includes(user?.role);
  const showManager = ["Employee", "Manager", "Executive"].includes(values.employeeType);

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Name is required";
    if (!values.email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "That doesn't look like a valid email";
    if (!isEdit) {
      if (!values.password) next.password = "Password is required";
      else if (values.password.length < 8) next.password = "At least 8 characters";
    } else if (values.password && values.password.length < 8) {
      next.password = "At least 8 characters";
    }
    if (values.password && values.password !== values.passwordConfirmation) {
      next.passwordConfirmation = "Passwords don't match";
    }
    if (isInternee && !values.interneeManagerId) {
      next.interneeManagerId = "An internee needs a grading manager";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Please fix the highlighted fields.");

    const payload = { ...values };
    if (!canSetContract) delete payload.contractStatus;

    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: employeeId, ...payload });
        toast.success(`${values.name} updated.`);
        navigate(`/employees/${employeeId}`);
      } else {
        const created = await createMut.mutateAsync(payload);
        toast.success(`${values.name} added.`);
        navigate(created?.id ? `/employees/${created.id}` : "/employees");
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't save the employee."));
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingExisting) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  return (
    <div className="pb-10">
      <PageHeader
        maxWidth="max-w-3xl"
        title={isEdit ? `Edit ${existing?.name || "employee"}` : "Add Employee"}
        subtitle={isEdit ? "Update their details and access." : "Create a portal account for a new team member."}
        actions={
          <Button variant="secondary" icon="solar:arrow-left-linear" onClick={() => navigate(isEdit ? `/employees/${employeeId}` : "/employees")}>
            Cancel
          </Button>
        }
      />

      <form onSubmit={submit} className="px-4 sm:px-6 lg:px-8 mt-5 max-w-3xl mx-auto space-y-4">
        {/* Identity */}
        <section className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required error={errors.name} className="sm:col-span-2">
              <TextField value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" invalid={!!errors.name} />
            </Field>
            <Field label="Email" required error={errors.email}>
              <TextField type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@archilance.net" invalid={!!errors.email} />
            </Field>
            <Field label="Phone" error={errors.phone} hint="Must be unique if set">
              <TextField value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 0000000" />
            </Field>
            <Field label="Username" error={errors.username} hint="Optional — can sign in with this too">
              <TextField value={values.username} onChange={(e) => set("username", e.target.value)} placeholder="jane.doe" />
            </Field>
            <Field label="Employee type" required>
              <SearchSelect
                options={EMPLOYEE_TYPES.map((t) => ({ value: t, label: t }))}
                value={values.employeeType}
                onChange={(v) => set("employeeType", v)}
                size="lg"
              />
            </Field>
            {canSetTeam && (
              <Field label="Team" hint="Optional — used for grouping and reporting">
                <SearchSelect
                  options={TEAM_OPTIONS}
                  value={values.employeeTeam}
                  onChange={(v) => set("employeeTeam", v)}
                  placeholder="No team"
                  size="lg"
                  clearable
                />
              </Field>
            )}
          </div>
          <p className="text-[11px] text-[var(--ink-tertiary)] mt-3 flex items-start gap-1.5">
            <Icon icon="solar:bolt-bold-duotone" className="text-[12px] mt-0.5 flex-none text-primary-500" />
            {TYPE_HINT[values.employeeType]}
          </p>
        </section>

        {/* Reporting & dates */}
        <section className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Reporting & dates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Joining date" hint="Drives leave cycles and internee grading eligibility">
              <DateField value={values.joiningDate} onChange={(d) => set("joiningDate", d)} />
            </Field>
            <Field label="Probation ends" hint="Admins are emailed on this date">
              <DateField value={values.probationEndDate} onChange={(d) => set("probationEndDate", d)} align="right" />
            </Field>

            {isInternee && (
              <Field label="Grading manager" required error={errors.interneeManagerId} className="sm:col-span-2">
                <SearchSelect
                  options={managerOptions}
                  value={values.interneeManagerId}
                  onChange={(v) => set("interneeManagerId", v)}
                  placeholder={loadingRoster ? "Loading…" : "Choose who grades this internee"}
                  clearable
                  size="lg"
                  renderOption={(o) => (
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate">{o.label}</span>
                      <span className="text-[10px] text-[var(--ink-tertiary)] flex-none">{o.sub}</span>
                    </span>
                  )}
                />
              </Field>
            )}

            {showManager && (
              <Field label="Reports to" hint="Optional line manager" className="sm:col-span-2">
                <SearchSelect
                  options={managerOptions}
                  value={values.managerId}
                  onChange={(v) => set("managerId", v)}
                  placeholder={loadingRoster ? "Loading…" : "No manager"}
                  clearable
                  size="lg"
                />
              </Field>
            )}
          </div>
        </section>

        {/* Access */}
        <section className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--ink-primary)] mb-1">Access</p>
          <p className="text-xs text-[var(--ink-tertiary)] mb-4">
            {isEdit
              ? "Leave the password blank to keep their current one."
              : "They'll sign in with this password and can change it from their profile."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={isEdit ? "New password" : "Password"} required={!isEdit} error={errors.password}>
              <div className="relative">
                <TextField
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={isEdit ? "Unchanged" : "At least 8 characters"}
                  autoComplete="new-password"
                  className="pr-11"
                  invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
                >
                  <Icon icon={showPassword ? "solar:eye-closed-linear" : "solar:eye-linear"} className="text-[16px]" />
                </button>
              </div>
            </Field>
            <Field label="Confirm password" required={!isEdit} error={errors.passwordConfirmation}>
              <TextField
                type={showPassword ? "text" : "password"}
                value={values.passwordConfirmation}
                onChange={(e) => set("passwordConfirmation", e.target.value)}
                placeholder={isEdit ? "Unchanged" : "Repeat the password"}
                autoComplete="new-password"
                invalid={!!errors.passwordConfirmation}
              />
            </Field>
          </div>

          {canSetContract && (
            <div className={cn(
              "flex items-start justify-between gap-4 mt-4 pt-4 border-t border-[var(--line-subtle)]"
            )}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink-primary)]">Skip the contract gate</p>
                <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                  On, they can sign in straight away. Off, they must accept their contract first.
                </p>
              </div>
              <Toggle
                checked={values.contractStatus}
                onChange={(v) => set("contractStatus", v)}
                label="Skip the contract gate"
              />
            </div>
          )}
        </section>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={() => navigate(isEdit ? `/employees/${employeeId}` : "/employees")}>
            Cancel
          </Button>
          <Button type="submit" size="lg" isLoading={saving} icon="solar:check-circle-bold">
            {isEdit ? "Save changes" : "Add employee"}
          </Button>
        </div>

        <p className="text-[11px] text-[var(--ink-tertiary)] text-center">
          Profile pictures aren't set here — the backend doesn't accept one on this endpoint. Employees
          upload their own from their profile page.
        </p>
      </form>
    </div>
  );
};

export default EmployeeFormPage;
