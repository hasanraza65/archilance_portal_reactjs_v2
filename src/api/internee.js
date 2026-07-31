import { apiClient } from "./client";
import { ep } from "./endpoint";

/**
 * Internee grading. All routes live under the employee prefix, and the backend
 * treats `employee_type === "Executive"` as elevated (sees every rating).
 *
 * The five scored dimensions are fixed server-side; keep this list in sync with
 * InterneeRatingController::RATING_FIELDS.
 */
export const RATING_FIELDS = [
  { key: "technical_accuracy", label: "Technical accuracy", hint: "Correctness and quality of the work produced." },
  { key: "learning_improvement", label: "Learning & improvement", hint: "Picks things up and applies feedback." },
  { key: "ownership_initiative", label: "Ownership & initiative", hint: "Takes responsibility without being chased." },
  { key: "communication_professionalism", label: "Communication", hint: "Clear, timely and professional." },
  { key: "overall_recommendation", label: "Overall recommendation", hint: "Would you want them on your next job?" },
];

/** Interns managed by the signed-in user. */
export async function fetchMyInternees(role) {
  const res = await apiClient.get(ep(role, "/my-internees"));
  return res.data?.data || [];
}

/**
 * Paginated ratings. `eligibility` is additive: non-null only for internees, and
 * when `is_eligible` is false the server returns an EMPTY page on purpose — an
 * internee can't see their grades until a month after joining.
 */
export async function fetchInterneeRatings(role, { page = 1, interneeId, projectId, taskId, dateFrom, dateTo } = {}) {
  const params = { page };
  if (interneeId) params.internee_id = interneeId;
  if (projectId) params.project_id = projectId;
  if (taskId) params.task_id = taskId;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const res = await apiClient.get(ep(role, "/internee-rating"), { params });
  const d = res.data;
  return {
    items: d?.data || [],
    currentPage: d?.current_page ?? 1,
    lastPage: d?.last_page ?? 1,
    total: d?.total ?? 0,
    eligibility: d?.eligibility ?? null,
  };
}

/**
 * Submit a grade. The server rolls `task_id` up to its ROOT task, so grading a
 * sub-task and grading its parent collide — hence the duplicate check it does on
 * (manager, internee, root task, date).
 *
 * `didNotWork: true` stores nulls for every score.
 */
export async function createInterneeRating(role, { interneeId, taskId, ratingDate, didNotWork = false, scores = {}, comments }) {
  const body = {
    internee_id: interneeId,
    task_id: taskId,
    rating_date: ratingDate,
    did_not_work: didNotWork,
    comments: comments || null,
  };
  if (!didNotWork) {
    for (const f of RATING_FIELDS) body[f.key] = scores[f.key];
  }
  const res = await apiClient.post(ep(role, "/internee-rating"), body);
  return res.data;
}

export async function updateInterneeRating(role, id, { didNotWork = false, scores = {}, comments }) {
  const body = { did_not_work: didNotWork, comments: comments || null };
  if (!didNotWork) {
    for (const f of RATING_FIELDS) body[f.key] = scores[f.key];
  }
  const res = await apiClient.put(ep(role, `/internee-rating/${id}`), body);
  return res.data;
}

/** Average of the five dimensions for one rating row (null when they didn't work). */
export function ratingAverage(row) {
  if (!row || row.did_not_work) return 0;
  const vals = RATING_FIELDS.map((f) => Number(row[f.key])).filter((n) => Number.isFinite(n));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
