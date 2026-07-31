import React, { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useEmployee, useDeleteEmployee } from "./useEmployeeMutations";
import { useAllEmployees } from "./useEmployeesData";
import { getMediaUrl } from "@/api/media";
import { useAuth } from "@/auth/AuthContext";
import { canManageEmployees } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { extractErrorMessage } from "@/api/client";
import { toast } from "@/lib/toast";

const monthsSince = (date) => {
  if (!date) return null;
  const start = new Date(date);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  let m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) m--;
  return Math.max(0, m);
};

const Row = ({ icon, label, value, muted }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon icon={icon} className="text-[15px] text-[var(--ink-tertiary)] mt-0.5 flex-none" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">{label}</p>
      <p className={muted ? "text-sm text-[var(--ink-tertiary)] italic" : "text-sm text-[var(--ink-primary)] font-medium break-words"}>
        {value}
      </p>
    </div>
  </div>
);

const EmployeeDetailPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editable = canManageEmployees(user?.role);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: employee, isLoading, isError } = useEmployee(employeeId);
  const { data: roster = [] } = useAllEmployees();
  const deleteMut = useDeleteEmployee();

  const byId = useMemo(() => new Map(roster.map((e) => [String(e.id), e])), [roster]);
  const manager = employee?.manager_id ? byId.get(String(employee.manager_id)) : null;
  const gradingManager = employee?.internee_manager_id ? byId.get(String(employee.internee_manager_id)) : null;
  const service = monthsSince(employee?.joining_date);

  const remove = async () => {
    try {
      await deleteMut.mutateAsync(employeeId);
      toast.success(`${employee?.name || "Employee"} removed.`);
      navigate("/employees");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't remove this employee."));
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  if (isError || !employee) {
    return (
      <div className="pb-10">
        <PageHeader
        maxWidth="max-w-4xl" title="Employee" />
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
          <EmptyState
            icon="solar:folder-error-linear"
            title="Employee not found"
            description="They may have been removed, or the link is out of date."
          />
        </div>
      </div>
    );
  }

  const isInternee = employee.employee_type === "Internee";

  return (
    <div className="pb-10">
      <PageHeader
        title={employee.name}
        subtitle={employee.employee_type || "Employee"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="solar:arrow-left-linear" onClick={() => navigate("/employees")}>
              All employees
            </Button>
            {editable && (
              <>
                <Button variant="secondary" icon="solar:pen-linear" onClick={() => navigate(`/employees/${employeeId}/edit`)}>
                  Edit
                </Button>
                <Button variant="danger" icon="solar:trash-bin-trash-linear" onClick={() => setConfirmDelete(true)}>
                  Remove
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-5 max-w-4xl mx-auto space-y-4">
        {/* Identity card */}
        <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar
              name={employee.name}
              src={employee.profile_pic ? getMediaUrl(employee.profile_pic) : null}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--ink-primary)]">{employee.name}</h2>
                {employee.employee_type && <Badge tone="neutral">{employee.employee_type}</Badge>}
                {Number(employee.contract_status) === 1 ? (
                  <Badge tone="success">Contract accepted</Badge>
                ) : (
                  <Badge tone="warning">Contract pending</Badge>
                )}
                {Number(employee.is_default_pass) === 1 && <Badge tone="danger">Temporary password</Badge>}
              </div>
              <p className="text-sm text-[var(--ink-secondary)] mt-1">{employee.email}</p>
              {service !== null && (
                <p className="text-xs text-[var(--ink-tertiary)] mt-1">
                  {service} month{service === 1 ? "" : "s"} of service
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--line-subtle)]">
            <Button size="sm" variant="secondary" icon="solar:clock-circle-bold-duotone" onClick={() => navigate(`/work-diary/${employeeId}`)}>
              Work diary
            </Button>
            {editable && (
              <Button size="sm" variant="secondary" icon="solar:stopwatch-bold-duotone" onClick={() => navigate(`/employees/${employeeId}/work-hours`)}>
                Working hours
              </Button>
            )}
            <Button size="sm" variant="secondary" icon="solar:calendar-mark-bold-duotone" onClick={() => navigate("/leaves")}>
              Leaves
            </Button>
            {isInternee && (
              <Button size="sm" variant="secondary" icon="solar:medal-ribbons-star-bold-duotone" onClick={() => navigate(`/internee-grading?internee=${employeeId}`)}>
                Grading
              </Button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--ink-primary)] mb-1">Contact</p>
            <div className="divide-y divide-[var(--line-subtle)]">
              <Row icon="solar:letter-linear" label="Email" value={employee.email || "Not set"} muted={!employee.email} />
              <Row icon="solar:user-circle-bold-duotone" label="Username" value={employee.username || "Not set"} muted={!employee.username} />
              <Row icon="solar:chat-round-dots-linear" label="Phone" value={employee.phone || "Not set"} muted={!employee.phone} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--ink-primary)] mb-1">Employment</p>
            <div className="divide-y divide-[var(--line-subtle)]">
              <Row
                icon="solar:calendar-linear"
                label="Joined"
                value={employee.joining_date ? formatDate(employee.joining_date) : "Not set"}
                muted={!employee.joining_date}
              />
              <Row
                icon="solar:hourglass-bold-duotone"
                label="Probation ends"
                value={employee.probation_period_end_date ? formatDate(employee.probation_period_end_date) : "Not set"}
                muted={!employee.probation_period_end_date}
              />
              <Row
                icon="solar:users-group-rounded-linear"
                label={isInternee ? "Grading manager" : "Reports to"}
                value={
                  isInternee ? (
                    gradingManager ? (
                      <Link to={`/employees/${gradingManager.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                        {gradingManager.name}
                      </Link>
                    ) : employee.internee_manager_id ? `#${employee.internee_manager_id}` : "Not set"
                  ) : manager ? (
                    <Link to={`/employees/${manager.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                      {manager.name}
                    </Link>
                  ) : employee.manager_id ? `#${employee.manager_id}` : "Not set"
                }
                muted={isInternee ? !employee.internee_manager_id : !employee.manager_id}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove employee?" className="max-w-md">
        <p className="text-sm text-[var(--ink-secondary)]">
          <strong className="text-[var(--ink-primary)]">{employee.name}</strong> will lose access to the portal
          immediately. This is a soft delete — their work sessions, tasks and history stay intact, and the
          account can be restored by re-creating it with the same email.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteMut.isPending} onClick={remove}>Remove employee</Button>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeDetailPage;
