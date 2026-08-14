import React from "react";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { useAuth } from "@/auth/AuthContext";
import { isAdminOrExecutive } from "@/lib/roles";
import { getMediaUrl } from "@/api/media";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Who approved or rejected a leave request, and when.
 *
 * Visible to admins and executives only. The backend already withholds
 * `approver` / `reviewed_at` from everyone else, so this is the second of two
 * gates — the server is the one that actually enforces it.
 *
 * Note the column is named `approved_by` but is stamped for BOTH outcomes, so
 * `approver` means "reviewed by"; read it together with `status`.
 */

const TONES = {
  Approved: {
    verb: "Approved",
    icon: "solar:check-circle-bold",
    wrap: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    strong: "text-emerald-700 dark:text-emerald-400",
    soft: "text-emerald-800/80 dark:text-emerald-300/80",
  },
  Rejected: {
    verb: "Rejected",
    icon: "solar:close-circle-bold",
    wrap: "border-red-200 bg-red-50 dark:border-red-500/25 dark:bg-red-500/10",
    strong: "text-red-700 dark:text-red-400",
    soft: "text-red-800/80 dark:text-red-300/80",
  },
};

const ReviewAudit = ({ request, className }) => {
  const { user } = useAuth();

  const tone = TONES[request?.status];
  if (!isAdminOrExecutive(user?.role)) return null;

  // Pending: nothing has been decided, so instead of the outcome we show WHO
  // the request is waiting on — the employee's reporting manager. With the new
  // routing, that person is the one who received it; no manager set means it
  // lands with admins/executives directly, so say that instead.
  if (!tone) {
    if (request?.status !== "Pending") return null;
    const mgr = request?.user?.manager;
    // The backend only attaches `manager` for admin/exec viewers; an absent key
    // on an older cached row simply renders nothing.
    if (request?.user === undefined || !("manager" in (request.user || {}))) return null;
    return (
      <div
        className={cn(
          "inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border px-2.5 py-1.5",
          "border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10",
          className
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Icon icon="solar:hourglass-bold-duotone" className="text-[13px]" />
          Awaiting
        </span>
        {mgr ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-800/80 dark:text-amber-300/80">
            <Avatar name={mgr.name} src={mgr.profile_pic ? getMediaUrl(mgr.profile_pic) : null} size="xs" />
            <span className="font-semibold">{mgr.name}</span>
            <span className="text-[var(--ink-tertiary)]">(reporting manager)</span>
          </span>
        ) : (
          <span className="text-xs text-amber-800/80 dark:text-amber-300/80">
            no manager assigned — yours to action
          </span>
        )}
      </div>
    );
  }

  const reviewer = request.approver;
  const reviewedAt = formatDateTime(request.reviewed_at);
  if (!reviewer && !reviewedAt) return null; // older rows with no audit trail

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border px-2.5 py-1.5",
        tone.wrap,
        className
      )}
    >
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", tone.strong)}>
        <Icon icon={tone.icon} className="text-[13px]" />
        {tone.verb}
      </span>

      {reviewer && (
        <span className={cn("inline-flex items-center gap-1.5 text-xs", tone.soft)}>
          <span className="text-[var(--ink-tertiary)]">by</span>
          <Avatar
            name={reviewer.name}
            src={reviewer.profile_pic ? getMediaUrl(reviewer.profile_pic) : null}
            size="xs"
          />
          <span className="font-semibold">{reviewer.name}</span>
        </span>
      )}

      {reviewedAt && (
        <span className={cn("inline-flex items-center gap-1.5 text-xs", tone.soft)}>
          <span className="text-[var(--ink-tertiary)]">on</span>
          <Icon icon="solar:clock-circle-linear" className="text-[12px]" />
          <span className="font-medium">{reviewedAt}</span>
        </span>
      )}
    </div>
  );
};

export default ReviewAudit;
