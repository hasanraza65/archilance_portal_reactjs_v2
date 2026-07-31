import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import SearchSelect from "@/components/ui/SearchSelect";
import DateField from "@/components/ui/DateField";
import { Field, TextField, TextArea } from "@/components/ui/Field";
import { useCreateJob } from "../useJobsData";
import { useCustomers } from "@/features/customers/useCustomersData";
import { useAllEmployees } from "@/features/employees/useEmployeesData";
import { getMediaUrl } from "@/api/media";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = { name: "", description: "", startDate: today(), dueDate: null, customerId: null, employeeIds: [] };

/**
 * Create a job. Deliberately create-only: editing happens inline on the job
 * detail header, which is where people already are when they want to change
 * something.
 */
const JobFormModal = ({ open, onClose, onCreated }) => {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [memberQuery, setMemberQuery] = useState("");

  const createJob = useCreateJob();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: employees = [] } = useAllEmployees();

  useEffect(() => {
    if (open) { setValues(EMPTY); setErrors({}); setMemberQuery(""); }
  }, [open]);

  const set = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.name, sub: c.email })),
    [customers]
  );

  // Selected first, then filtered by the search box — same pattern as the
  // assignee picker, so what you've already chosen never scrolls out of view.
  const memberList = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const match = (e) =>
      !q || [e.name, e.email, e.employee_type].some((v) => String(v || "").toLowerCase().includes(q));
    const selected = employees.filter((e) => values.employeeIds.includes(e.id));
    const rest = employees.filter((e) => !values.employeeIds.includes(e.id) && match(e));
    return [...selected.filter(match), ...rest];
  }, [employees, values.employeeIds, memberQuery]);

  const toggleMember = (id) =>
    set("employeeIds", values.employeeIds.includes(id)
      ? values.employeeIds.filter((x) => x !== id)
      : [...values.employeeIds, id]);

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Job name is required";
    if (values.dueDate && values.startDate && values.dueDate < values.startDate) {
      next.dueDate = "Due date can't be before the start date";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const job = await createJob.mutateAsync({
        projectName: values.name.trim(),
        projectDescription: values.description.trim() || null,
        startDate: values.startDate,
        dueDate: values.dueDate,
        customerId: values.customerId,
        employeeIds: values.employeeIds,
      });
      toast.success(`"${values.name.trim()}" created.`);
      onClose();
      onCreated?.(job);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't create the job."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Job"
      className="max-w-xl"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="job-form"
            isLoading={createJob.isPending}
            icon="solar:add-circle-bold"
            className="flex-1 sm:flex-none"
          >
            Create job
          </Button>
        </div>
      }
    >
      {/* `id` lets the pinned footer's submit button drive this form from
          outside the <form> element. */}
      <form id="job-form" onSubmit={submit} className="space-y-4">
        <Field label="Job name" required error={errors.name}>
          <TextField
            autoFocus
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Riverside Residence — Full Set"
            invalid={!!errors.name}
          />
        </Field>

        <Field label="Description" hint="Optional — you can flesh this out later on the job page">
          <TextArea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What is this job about?"
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <DateField value={values.startDate} onChange={(d) => set("startDate", d)} clearable={false} />
          </Field>
          <Field label="Due date" error={errors.dueDate}>
            <DateField value={values.dueDate} onChange={(d) => set("dueDate", d)} align="right" />
          </Field>
        </div>

        <Field label="Customer" hint="Who this job belongs to">
          <SearchSelect
            options={customerOptions}
            value={values.customerId}
            onChange={(v) => set("customerId", v)}
            placeholder={loadingCustomers ? "Loading customers…" : "No customer"}
            clearable
            size="lg"
            renderOption={(o) => (
              <span className="flex flex-col items-start">
                <span className="truncate">{o.label}</span>
                {o.sub && <span className="text-[10px] text-[var(--ink-tertiary)] truncate">{o.sub}</span>}
              </span>
            )}
          />
        </Field>

        {/* Team */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--ink-secondary)]">Assign team</label>
            <span className="text-[11px] text-[var(--ink-tertiary)]">{values.employeeIds.length} selected</span>
          </div>

          <div className="rounded-xl border border-[var(--line-subtle)] overflow-hidden">
            <div className="relative border-b border-[var(--line-subtle)]">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[14px]" />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search employees…"
                className="w-full h-11 sm:h-10 pl-9 pr-3 bg-transparent text-[16px] sm:text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-40 sm:max-h-48 overflow-y-auto">
              {memberList.length === 0 ? (
                <p className="text-xs text-[var(--ink-tertiary)] px-3 py-4 text-center">No employees match that.</p>
              ) : (
                memberList.map((e) => {
                  const checked = values.employeeIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleMember(e.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        checked ? "bg-primary-500/8" : "hover:bg-[var(--surface-sunken)]"
                      )}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-none",
                        checked ? "bg-primary-500 border-primary-500 text-white" : "border-[var(--line-strong)]"
                      )}>
                        {checked && <Icon icon="solar:check-read-linear" className="text-[10px]" />}
                      </span>
                      <Avatar name={e.name} src={e.profile_pic ? getMediaUrl(e.profile_pic) : null} size="xs" />
                      <span className="text-[13px] text-[var(--ink-primary)] truncate flex-1">{e.name}</span>
                      {e.employee_type && (
                        <span className="text-[10px] text-[var(--ink-tertiary)] flex-none">{e.employee_type}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {values.employeeIds.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
              <Icon icon="solar:danger-triangle-bold" className="text-[12px] mt-0.5 flex-none" />
              Everyone selected is notified <strong>and emailed</strong> as soon as the job is created. Leave this
              empty to create it quietly and assign people later.
            </p>
          )}
        </div>

      </form>
    </Modal>
  );
};

export default JobFormModal;
