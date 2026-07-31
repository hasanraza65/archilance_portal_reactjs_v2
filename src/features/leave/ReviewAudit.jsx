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
  if (!tone) return null; // Pending — nothing has been decided yet
  if (!isAdminOrExecutive(user?.role)) return null;

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
